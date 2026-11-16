import { Repository, Not, MoreThanOrEqual, Between, IsNull } from 'typeorm';
import { DatabaseConnection } from '../../../core/database/DatabaseConnection';
import { CierreCajaEntity } from '../entities/cierre-caja.entity';
import { GastoEntity } from '../entities/gasto.entity';
import { PedidoEntity } from '../../pedidos/entities/pedido.entity';
import { MesaEntity } from '../../mesas/entities/mesa.entity';
import { ImpresionService } from '../../impresion/services/impresion.service';
import { SequenceService } from '../../impresion/services/sequence.service';
import { realTimeEmitter } from '../../../core/events/realtime.events';

export class CierreCajaService {
  private cierreRepo: Repository<CierreCajaEntity>;
  private pedidoRepo: Repository<PedidoEntity>;
  private mesaRepo: Repository<MesaEntity>;
  private gastoRepo: Repository<GastoEntity>;
  private impresionService: ImpresionService;
  private sequenceService: SequenceService;

  constructor() {
    const ds = DatabaseConnection.appDataSource;
    this.cierreRepo = ds.getRepository(CierreCajaEntity);
    this.pedidoRepo = ds.getRepository(PedidoEntity);
    this.mesaRepo = ds.getRepository(MesaEntity);
    this.gastoRepo = ds.getRepository(GastoEntity);
    this.impresionService = new ImpresionService();
    this.sequenceService = SequenceService.getInstance();
  }

  private getLocalDateStr(dateInput?: Date | string): string {
    const d = dateInput ? new Date(dateInput) : new Date();
    const valid = isNaN(d.getTime()) ? new Date() : d;
    const year = valid.getFullYear();
    const month = String(valid.getMonth() + 1).padStart(2, '0');
    const day = String(valid.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private isOrderPaid(p: PedidoEntity): boolean {
    if (!p || p.estado === 'Cancelado') return false;
    if (p.tipo === 'Domicilio') {
      return (
        (p.estado === 'Completado' ||
          p.estado === 'Pagado' ||
          p.estado === 'Enviado' ||
          p.estado === 'En camino') &&
        Boolean(p.metodo_pago)
      );
    }
    return p.estado === 'Completado' || p.estado === 'Pagado';
  }

  private categorizePaymentMethod(rawMetodo: string): 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Otros' {
    const m = (rawMetodo || '').trim().toLowerCase();
    if (!m || m.includes('efectivo') || m === 'efec') return 'Efectivo';
    if (
      m.includes('tarjeta') ||
      m.includes('dataf') ||
      m.includes('datáf') ||
      m.includes('debito') ||
      m.includes('débito') ||
      m.includes('cred') ||
      m.includes('créd') ||
      m.includes('bold')
    ) {
      return 'Tarjeta';
    }
    if (
      m.includes('transf') ||
      m.includes('nequi') ||
      m.includes('davi') ||
      m.includes('bre') ||
      m.includes('banc')
    ) {
      return 'Transferencia';
    }
    return 'Otros';
  }

  async getTurnoAbierto(): Promise<CierreCajaEntity | null> {
    return await this.cierreRepo.findOne({
      where: { estado: 'Abierto' },
      order: { fecha_apertura: 'DESC' },
    });
  }

  async getHistorial(): Promise<any[]> {
    const abierto = await this.getTurnoAbierto();
    if (abierto) {
      try {
        await this.obtenerResumenTurno(abierto.id);
      } catch (_) {}
    }

    const cierres = await this.cierreRepo.find({
      order: { fecha_apertura: 'DESC' },
      take: 100,
    });

    const allGastos = await this.gastoRepo.find();

    return cierres.map((c) => {
      const fInicio = new Date(c.fecha_apertura).getTime();
      const fFin = c.fecha_cierre ? new Date(c.fecha_cierre).getTime() : Date.now();
      const shiftDateStr = this.getLocalDateStr(c.fecha_apertura);

      const gastosDelCierre = allGastos.filter((g) => {
        if (g.cierre_id && Number(g.cierre_id) === Number(c.id)) return true;
        if (g.cierre_id && Number(g.cierre_id) !== Number(c.id)) return false;
        const gTime = g.created_at ? new Date(g.created_at).getTime() : 0;
        if (gTime >= fInicio && gTime <= fFin) return true;
        if (c.estado === 'Abierto' && g.fecha === shiftDateStr) return true;
        return false;
      });

      const gastosEfectivo = gastosDelCierre
        .filter((g) => (g.metodo_pago || 'Efectivo').toLowerCase().includes('efectivo'))
        .reduce((sum, g) => sum + (Number(g.monto) || 0), 0);
      const totalGastos = gastosDelCierre.reduce((sum, g) => sum + (Number(g.monto) || 0), 0);

      return {
        ...c,
        gastos_efectivo: gastosEfectivo,
        total_gastos: totalGastos,
      };
    });
  }

  async abrirCaja(
    usuarioId: number,
    usuarioNombre: string,
    montoInicial: number
  ): Promise<CierreCajaEntity> {
    const existente = await this.getTurnoAbierto();
    if (existente) {
      throw new Error(`Ya existe un turno de caja abierto por el usuario ${existente.usuario_nombre}`);
    }

    // Reiniciar secuencia diaria de pedidos al abrir una nueva caja
    this.sequenceService.resetSequence();

    const nuevoCierre = this.cierreRepo.create({
      usuario_id: usuarioId,
      usuario_nombre: usuarioNombre,
      monto_inicial: montoInicial,
      ventas_efectivo: 0,
      ventas_tarjeta: 0,
      ventas_transferencia: 0,
      total_ventas: 0,
      total_esperado_efectivo: montoInicial,
      estado: 'Abierto',
      fecha_apertura: new Date(),
    });

    // Abrir cajón monedero en segundo plano sin bloquear la respuesta HTTP
    this.impresionService.abrirCaja().catch((err) => {
      console.error('[CierreCaja] Error al disparar la apertura de cajón en segundo plano:', err);
    });

    const saved = await this.cierreRepo.save(nuevoCierre);
    realTimeEmitter.broadcast('caja_changed' as any, saved);
    return saved;
  }

  async obtenerResumenTurno(cierreId: number): Promise<any> {
    const cierre = await this.cierreRepo.findOne({ where: { id: cierreId } });
    if (!cierre) throw new Error('Turno de caja no encontrado');

    const fechaInicio = new Date(cierre.fecha_apertura);
    const fechaFin = cierre.fecha_cierre ? new Date(cierre.fecha_cierre) : null;
    const shiftDateStr = this.getLocalDateStr(fechaInicio);

    // Incluir todos los pedidos del turno no cancelados por cierre_id o creados dentro de la ventana sin otro cierre_id
    const pedidosTurno = await this.pedidoRepo.find({
      where: [
        {
          estado: Not('Cancelado'),
          cierre_id: String(cierreId),
        },
        {
          estado: Not('Cancelado'),
          fecha: fechaFin ? Between(fechaInicio, fechaFin) : MoreThanOrEqual(fechaInicio),
        },
      ],
      order: { fecha: 'DESC' },
    });

    // Filtrar pedidos únicos que pertenezcan a este turno y estén efectivamente cobrados/pagados
    const uniquePedidosMap = new Map<string, PedidoEntity>();
    for (const p of pedidosTurno) {
      if (p.cierre_id && String(p.cierre_id) !== String(cierreId)) continue;
      if (!this.isOrderPaid(p)) continue;
      uniquePedidosMap.set(p.id, p);
    }
    const pedidosUnicos = Array.from(uniquePedidosMap.values());

    let efectivo = 0;
    let tarjeta = 0;
    let transferencia = 0;
    let otros = 0;
    let cantEfectivo = 0;
    let cantTarjeta = 0;
    let cantTransferencia = 0;
    let cantOtros = 0;
    let ventasMesas = 0;
    let ventasMesasCant = 0;
    let ventasDomicilios = 0;
    let ventasDomiciliosCant = 0;

    for (const p of pedidosUnicos) {
      const montoTotal = Number(p.total) || 0;
      if (montoTotal <= 0) continue;

      if (p.tipo === 'Domicilio') {
        ventasDomicilios += montoTotal;
        ventasDomiciliosCant += 1;
      } else {
        ventasMesas += montoTotal;
        ventasMesasCant += 1;
      }

      let pagosMixtos: { metodo: string; monto: number }[] = [];
      if (Array.isArray(p.pagos_mixtos)) {
        pagosMixtos = p.pagos_mixtos;
      } else if (typeof p.pagos_mixtos === 'string') {
        try {
          const parsed = JSON.parse(p.pagos_mixtos);
          if (Array.isArray(parsed)) pagosMixtos = parsed;
        } catch (e) {}
      }

      if (pagosMixtos.length > 0) {
        for (const sub of pagosMixtos) {
          const subMonto = Number(sub.monto) || 0;
          if (subMonto <= 0) continue;
          const cat = this.categorizePaymentMethod(sub.metodo);
          if (cat === 'Efectivo') {
            efectivo += subMonto;
            cantEfectivo += 1;
          } else if (cat === 'Tarjeta') {
            tarjeta += subMonto;
            cantTarjeta += 1;
          } else if (cat === 'Transferencia') {
            transferencia += subMonto;
            cantTransferencia += 1;
          } else {
            otros += subMonto;
            cantOtros += 1;
          }
        }
      } else {
        const cat = this.categorizePaymentMethod(p.metodo_pago);
        if (cat === 'Efectivo') {
          efectivo += montoTotal;
          cantEfectivo += 1;
        } else if (cat === 'Tarjeta') {
          tarjeta += montoTotal;
          cantTarjeta += 1;
        } else if (cat === 'Transferencia') {
          transferencia += montoTotal;
          cantTransferencia += 1;
        } else {
          otros += montoTotal;
          cantOtros += 1;
        }
      }
    }

    // Consultar gastos del turno por cierre_id o creados durante el horario/fecha del turno
    const gastosTurno = await this.gastoRepo.find({
      where: [
        { cierre_id: cierreId },
        {
          cierre_id: IsNull(),
          created_at: fechaFin ? Between(fechaInicio, fechaFin) : MoreThanOrEqual(fechaInicio),
        },
        ...(cierre.estado === 'Abierto' ? [{ cierre_id: IsNull(), fecha: shiftDateStr }] : []),
      ],
      order: { created_at: 'DESC' },
    });

    const uniqueGastosMap = new Map<string, GastoEntity>();
    for (const g of gastosTurno) {
      if (g.cierre_id && Number(g.cierre_id) !== Number(cierreId)) continue;
      if (!g.cierre_id && cierre.estado === 'Abierto') {
        g.cierre_id = cierreId;
        await this.gastoRepo.save(g).catch(() => {});
      }
      uniqueGastosMap.set(g.id, g);
    }
    const gastosUnicos = Array.from(uniqueGastosMap.values());

    let gastosEfectivo = 0;
    let totalGastos = 0;
    for (const g of gastosUnicos) {
      const montoG = Number(g.monto) || 0;
      totalGastos += montoG;
      const gMetodo = (g.metodo_pago || 'Efectivo').toLowerCase();
      if (gMetodo.includes('efectivo')) {
        gastosEfectivo += montoG;
      }
    }

    cierre.ventas_efectivo = efectivo;
    cierre.ventas_tarjeta = tarjeta;
    cierre.ventas_transferencia = transferencia + otros;
    cierre.total_ventas = efectivo + tarjeta + transferencia + otros;
    cierre.total_esperado_efectivo = Number(cierre.monto_inicial || 0) + efectivo - gastosEfectivo;

    const savedCierre = await this.cierreRepo.save(cierre);

    const transacciones = pedidosUnicos.map((p: any) => ({
      id: p.id,
      hora: p.fecha,
      tipo: p.tipo === 'Domicilio' ? 'Domicilio' : 'Mesa',
      descripcion:
        p.tipo === 'Domicilio'
          ? `Domicilio - ${p.cliente_nombre || 'Sin nombre'}`
          : `Mesa ${p.mesa || 'Llevar/Otros'}`,
      metodo_pago: p.metodo_pago || 'Efectivo',
      total: Number(p.total || 0),
      vuelto: Number(p.vuelto || 0),
      propina_valor: Number(p.propina_valor || 0),
    }));

    return {
      ...savedCierre,
      total_gastos: totalGastos,
      gastos_efectivo: gastosEfectivo,
      gastos_lista: gastosUnicos,
      ventas_mesas: ventasMesas,
      ventas_mesas_cant: ventasMesasCant,
      ventas_domicilios: ventasDomicilios,
      ventas_domicilios_cant: ventasDomiciliosCant,
      ventas_otros: otros,
      total_transacciones: pedidosUnicos.length,
      resumen_metodos: [
        { metodo: 'Efectivo', total: efectivo, cantidad: cantEfectivo },
        { metodo: 'Tarjeta', total: tarjeta, cantidad: cantTarjeta },
        { metodo: 'Transferencia', total: transferencia, cantidad: cantTransferencia },
        { metodo: 'Otros', total: otros, cantidad: cantOtros },
      ],
      transacciones,
    };
  }

  async cerrarCaja(
    cierreId: number,
    montoRealContado: number,
    notas?: string
  ): Promise<CierreCajaEntity> {
    await this.obtenerResumenTurno(cierreId);
    const cierre = await this.cierreRepo.findOne({ where: { id: cierreId } });
    if (!cierre) throw new Error('Turno de caja no encontrado');
    if (cierre.estado === 'Cerrado') {
      throw new Error('Este turno de caja ya fue cerrado previamente');
    }

    // Validar que no existan mesas ocupadas o en uso
    const mesasNoLibres = await this.mesaRepo.count({
      where: { estado: Not('libre') },
    });

    if (mesasNoLibres > 0) {
      throw new Error(`No se puede cerrar la caja del día porque existen ${mesasNoLibres} mesa(s) que aún no están libres.`);
    }

    cierre.monto_real_contado = montoRealContado;
    cierre.diferencia = montoRealContado - Number(cierre.total_esperado_efectivo);
    cierre.estado = 'Cerrado';
    cierre.fecha_cierre = new Date();
    if (notas) cierre.notas = notas;

    const cierreGuardado = await this.cierreRepo.save(cierre);

    // Reiniciar secuencia de pedidos al cerrar caja
    this.sequenceService.resetSequence();

    // Abrir cajón para retiro de dinero final en segundo plano
    this.impresionService.abrirCaja().catch((err) => {
      console.error('[CierreCaja] Error al disparar la apertura de cajón en segundo plano al cerrar:', err);
    });

    // Limpiar/cerrar cualquier turno residual que hubiera quedado en estado 'Abierto'
    await this.cierreRepo.update({ estado: 'Abierto' }, { estado: 'Cerrado', fecha_cierre: new Date() });

    realTimeEmitter.broadcast('caja_changed' as any, cierreGuardado);
    return cierreGuardado;
  }
}

