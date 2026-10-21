import { Repository, Not, MoreThanOrEqual, Between, In } from 'typeorm';
import { DatabaseConnection } from '../../../core/database/DatabaseConnection';
import { CierreCajaEntity } from '../entities/cierre-caja.entity';
import { GastoEntity } from '../entities/gasto.entity';
import { PedidoEntity } from '../../pedidos/entities/pedido.entity';
import { MesaEntity } from '../../mesas/entities/mesa.entity';
import { ImpresionService } from '../../impresion/services/impresion.service';
import { SequenceService } from '../../impresion/services/sequence.service';

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
    this.sequenceService = new SequenceService();
  }

  async getTurnoAbierto(): Promise<CierreCajaEntity | null> {
    return await this.cierreRepo.findOne({
      where: { estado: 'Abierto' },
      order: { fecha_apertura: 'DESC' },
    });
  }

  async getHistorial(): Promise<CierreCajaEntity[]> {
    return await this.cierreRepo.find({
      order: { fecha_apertura: 'DESC' },
      take: 100,
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

    return await this.cierreRepo.save(nuevoCierre);
  }

  async obtenerResumenTurno(cierreId: number): Promise<CierreCajaEntity> {
    const cierre = await this.cierreRepo.findOne({ where: { id: cierreId } });
    if (!cierre) throw new Error('Turno de caja no encontrado');

    const fechaInicio = new Date(cierre.fecha_apertura);
    const fechaFin = cierre.fecha_cierre ? new Date(cierre.fecha_cierre) : null;

    // Incluir todos los pedidos del turno no cancelados por fecha o por cierre_id
    const pedidosTurno = await this.pedidoRepo.find({
      where: [
        {
          estado: Not('Cancelado'),
          cierre_id: String(cierreId),
        },
        {
          estado: Not('Cancelado'),
          fecha: fechaFin ? Between(fechaInicio, fechaFin) : MoreThanOrEqual(fechaInicio),
        }
      ],
    });

    // Eliminar pedidos duplicados si coincidieron en ambas condiciones de búsqueda
    const uniquePedidosMap = new Map<string, PedidoEntity>();
    for (const p of pedidosTurno) {
      uniquePedidosMap.set(p.id, p);
    }
    const pedidosUnicos = Array.from(uniquePedidosMap.values());

    let efectivo = 0;
    let tarjeta = 0;
    let transferencia = 0;

    for (const p of pedidosUnicos) {
      const montoTotal = Number(p.total) || 0;
      if (montoTotal <= 0) continue;

      // Ignorar pedidos activos en mesa que aún no hayan sido cobrados
      if (p.estado !== 'Completado' && p.estado !== 'Pagado' && !p.metodo_pago) continue;

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
          const subMetodo = (sub.metodo || '').toLowerCase().trim();
          if (subMetodo.includes('efectivo')) {
            efectivo += subMonto;
          } else if (subMetodo.includes('tarjeta') || subMetodo.includes('debito') || subMetodo.includes('credito') || subMetodo.includes('bold')) {
            tarjeta += subMonto;
          } else {
            transferencia += subMonto;
          }
        }
      } else {
        const metodo = (p.metodo_pago || '').toLowerCase().trim();
        if (metodo.includes('efectivo')) {
          efectivo += montoTotal;
        } else if (metodo.includes('tarjeta') || metodo.includes('debito') || metodo.includes('credito') || metodo.includes('bold')) {
          tarjeta += montoTotal;
        } else if (metodo.length > 0) {
          transferencia += montoTotal;
        } else {
          efectivo += montoTotal;
        }
      }
    }

    // Consultar gastos del turno por cierre_id o creados durante el horario del turno
    const gastosTurno = await this.gastoRepo.find({
      where: [
        { cierre_id: cierreId },
        { created_at: fechaFin ? Between(fechaInicio, fechaFin) : MoreThanOrEqual(fechaInicio) }
      ]
    });

    // Deduplicar gastos por id por si acaso
    const uniqueGastosMap = new Map<string, GastoEntity>();
    for (const g of gastosTurno) {
      uniqueGastosMap.set(g.id, g);
    }
    const gastosUnicos = Array.from(uniqueGastosMap.values());

    let gastosEfectivo = 0;
    for (const g of gastosUnicos) {
      const gMetodo = (g.metodo_pago || 'Efectivo').toLowerCase();
      if (gMetodo.includes('efectivo')) {
        gastosEfectivo += Number(g.monto) || 0;
      }
    }

    cierre.ventas_efectivo = efectivo;
    cierre.ventas_tarjeta = tarjeta;
    cierre.ventas_transferencia = transferencia;
    cierre.total_ventas = efectivo + tarjeta + transferencia;
    cierre.total_esperado_efectivo = Math.max(0, Number(cierre.monto_inicial) + efectivo - gastosEfectivo);

    return await this.cierreRepo.save(cierre);
  }

  async cerrarCaja(
    cierreId: number,
    montoRealContado: number,
    notas?: string
  ): Promise<CierreCajaEntity> {
    const cierre = await this.obtenerResumenTurno(cierreId);
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

    return cierreGuardado;
  }
}

