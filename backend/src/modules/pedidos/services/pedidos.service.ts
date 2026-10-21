import { DatabaseConnection } from '../../../core/database/DatabaseConnection';
import { PedidoEntity } from '../entities/pedido.entity';
import { MesaEntity } from '../../mesas/entities/mesa.entity';
import { CierreCajaEntity } from '../../config/entities/cierre-caja.entity';
import { Repository, Not, In, MoreThanOrEqual, Between } from 'typeorm';
import { SequenceService } from '../../impresion/services/sequence.service';
import { ImpresionService } from '../../impresion/services/impresion.service';
import { realTimeEmitter } from '../../../core/events/realtime.events';

export interface GetPedidosOptions {
  activeOnly?: boolean;
  todayOnly?: boolean;
  date?: string;
  all?: boolean;
  mesero?: string;
  usuario_id?: number;
}

export interface CreatePedidoOptions extends Partial<PedidoEntity> {
  autoPrint?: boolean;
  newItemsToPrint?: any[];
}

export class PedidosService {
  private pedidoRepository: Repository<PedidoEntity>;
  private mesaRepository: Repository<MesaEntity>;
  private sequenceService: SequenceService;
  private impresionService: ImpresionService;

  constructor() {
    this.pedidoRepository = DatabaseConnection.appDataSource.getRepository(PedidoEntity);
    this.mesaRepository = DatabaseConnection.appDataSource.getRepository(MesaEntity);
    this.sequenceService = SequenceService.getInstance();
    this.impresionService = new ImpresionService();
  }

  private validateItems(items: any): any[] {
    if (!items) return [];
    if (!Array.isArray(items)) {
      throw new Error('El campo items debe ser un arreglo');
    }
    return items.map((item, index) => {
      if (!item || typeof item !== 'object') {
        throw new Error(`El item en la posición ${index} es inválido`);
      }
      return {
        id: String(item.id ?? index),
        nombre: String(item.nombre || 'Producto'),
        precio: Number(item.precio) || 0,
        qty: Math.max(1, Number(item.qty) || 1),
        seccion: item.seccion ? String(item.seccion) : item.categoria ? String(item.categoria) : undefined,
        categoria: item.categoria ? String(item.categoria) : item.seccion ? String(item.seccion) : undefined,
        tipoEntrega: item.tipoEntrega ? String(item.tipoEntrega) : undefined,
        paraLlevar: item.paraLlevar !== undefined ? Boolean(item.paraLlevar) : undefined,
        observaciones: item.observaciones ? String(item.observaciones) : undefined,
        notas: item.notas ? String(item.notas) : undefined,
      };
    });
  }

  /**
   * Calcula los productos adicionales comparando los ítems anteriores con los actuales.
   */
  private calculateNewItems(original: any[], current: any[]): any[] {
    const newItems: any[] = [];
    for (const item of current) {
      const itemKey = `${item.id || item.nombre}_${item.notas || ''}_${item.tipoEntrega || 'mesa'}`;
      const origMatch = (original || []).find(
        (o) => `${o.id || o.nombre}_${o.notas || ''}_${o.tipoEntrega || 'mesa'}` === itemKey
      );
      const origQty = origMatch ? Number(origMatch.qty || 0) : 0;
      const diffQty = Number(item.qty || 0) - origQty;
      if (diffQty > 0) {
        newItems.push({
          ...item,
          qty: diffQty,
        });
      }
    }
    return newItems;
  }

  private attachSequence(pedido: PedidoEntity, createIfMissing: boolean = true): any {
    if (!pedido.orderNumber && createIfMissing) {
      const seq = this.sequenceService.getOrderSequence(pedido.id, pedido.tipo === 'Domicilio', createIfMissing);
      pedido.orderNumber = seq.orderNumber;
      if (pedido.tipo === 'Domicilio') {
        pedido.domicilioNumber = seq.domicilioNumber;
      }
      this.pedidoRepository
        .update(pedido.id, {
          orderNumber: pedido.orderNumber,
          domicilioNumber: pedido.domicilioNumber,
        })
        .catch((err) => console.error('[PedidosService] Error persistiendo orderNumber:', err.message));
    }
    return pedido;
  }

  /**
   * Actualiza el estado de una mesa en la base de datos de forma segura.
   */
  private async syncMesaStatus(mesaIdentifier: string, nuevoEstado: 'libre' | 'ocupada'): Promise<void> {
    try {
      const num = parseInt(String(mesaIdentifier).replace(/\D/g, ''), 10);
      if (!num || isNaN(num)) return;

      const mesa = await this.mesaRepository.findOneBy({ numero: num });
      if (mesa && mesa.estado !== nuevoEstado && mesa.estado !== 'mantenimiento' && mesa.estado !== 'reservada') {
        mesa.estado = nuevoEstado;
        await this.mesaRepository.save(mesa);
        realTimeEmitter.broadcast('mesa_changed', { mesa_id: mesa.mesa_id, numero: mesa.numero, estado: nuevoEstado });
      }
    } catch (err: any) {
      console.warn('[PedidosService] Advertencia sincronizando estado de mesa:', err.message);
    }
  }

  public async getAll(options: GetPedidosOptions = {}): Promise<any[]> {
    const { activeOnly, todayOnly, date, all, mesero, usuario_id } = options;
    let whereCondition: any = {};

    if (activeOnly) {
      whereCondition.estado = Not(In(['Completado', 'Cancelado']));
    } else if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      whereCondition.fecha = Between(startOfDay, endOfDay);
    } else if (todayOnly || !all) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      whereCondition.fecha = MoreThanOrEqual(startOfDay);
    }

    if (usuario_id) {
      whereCondition.usuario_id = usuario_id;
    } else if (mesero) {
      whereCondition.mesero = mesero;
    }

    const pedidos = await this.pedidoRepository.find({
      where: whereCondition,
      order: { fecha: 'DESC' },
    });
    const todayStr = new Date().toISOString().split('T')[0];
    return pedidos.map((p) => {
      const pedidoDate = p.fecha ? new Date(p.fecha).toISOString().split('T')[0] : todayStr;
      const isToday = pedidoDate === todayStr;
      return this.attachSequence(p, isToday);
    });
  }

  public async create(data: CreatePedidoOptions): Promise<any> {
    const autoPrint = data.autoPrint !== false;
    delete (data as any).autoPrint;

    if (data.items) {
      data.items = this.validateItems(data.items);
    }
    delete data.id;

    // Prevenir duplicación de pedidos activos en la misma mesa (fusionar adición)
    if (data.mesa && data.tipo !== 'Llevar' && data.tipo !== 'Domicilio') {
      const activeForMesa = await this.pedidoRepository.findOne({
        where: {
          mesa: data.mesa,
          estado: Not(In(['Completado', 'Cancelado'])),
        },
      });
      if (activeForMesa) {
        return this.update(activeForMesa.id, { ...data, autoPrint });
      }
    }

    // Asociar cierre_id del turno activo de caja si no viene en los datos
    if (!data.cierre_id) {
      try {
        const turnoAbierto = await DatabaseConnection.appDataSource.getRepository(CierreCajaEntity).findOne({
          where: { estado: 'Abierto' },
          order: { fecha_apertura: 'DESC' },
        });
        if (turnoAbierto) {
          data.cierre_id = String(turnoAbierto.id);
        }
      } catch (err: any) {
        console.error('[PedidosService] Error asociando cierre_id al pedido:', err.message);
      }
    }

    // Generar número de orden atómico antes de guardar
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const seq = this.sequenceService.getOrderSequence(tempId, data.tipo === 'Domicilio', true);
    data.orderNumber = seq.orderNumber;
    if (data.tipo === 'Domicilio') {
      data.domicilioNumber = seq.domicilioNumber;
    }

    const pedido = this.pedidoRepository.create(data);
    const saved = await this.pedidoRepository.save(pedido);

    // Si es pedido en mesa, marcar mesa automáticamente como ocupada
    if (saved.mesa && saved.tipo !== 'Llevar' && saved.tipo !== 'Domicilio') {
      await this.syncMesaStatus(saved.mesa, 'ocupada');
    }

    // Encolado automático y resiliente de comanda a cocina
    if (autoPrint && saved.items && saved.items.length > 0) {
      if (saved.tipo === 'Domicilio') {
        this.impresionService
          .encolarComandaDomicilio(saved, saved.items, false)
          .catch((err) => console.error('[PedidosService] Error encolando comanda domicilio:', err.message));
      } else {
        this.impresionService
          .encolarComandaCocina(saved, saved.items, false)
          .catch((err) => console.error('[PedidosService] Error encolando comanda cocina:', err.message));
      }
    }

    realTimeEmitter.broadcast('pedido_created', saved);
    return saved;
  }

  public async update(id: string, data: CreatePedidoOptions): Promise<any | null> {
    const pedido = await this.pedidoRepository.findOneBy({ id });
    if (!pedido) return null;

    const autoPrint = data.autoPrint !== false;
    delete (data as any).autoPrint;

    let newItemsToPrint = data.newItemsToPrint;
    delete (data as any).newItemsToPrint;

    if (data.items) {
      data.items = this.validateItems(data.items);
      // Si no se pasaron explícitamente los newItemsToPrint, calcular la diferencia automáticamente
      if (!newItemsToPrint && pedido.items && Array.isArray(pedido.items)) {
        newItemsToPrint = this.calculateNewItems(pedido.items, data.items);
      }
    }

    // Asignar cierre_id si aún no lo tiene y hay turno abierto
    if (!pedido.cierre_id && !data.cierre_id) {
      try {
        const turnoAbierto = await DatabaseConnection.appDataSource.getRepository(CierreCajaEntity).findOne({
          where: { estado: 'Abierto' },
          order: { fecha_apertura: 'DESC' },
        });
        if (turnoAbierto) {
          data.cierre_id = String(turnoAbierto.id);
        }
      } catch (err: any) {
        console.error('[PedidosService] Error asociando cierre_id en update:', err.message);
      }
    }

    Object.assign(pedido, data);
    if (pedido.tipo === 'Domicilio' && !pedido.domicilioNumber) {
      const seq = this.sequenceService.getOrderSequence(pedido.id, true, true);
      pedido.domicilioNumber = seq.domicilioNumber;
    }

    const saved = await this.pedidoRepository.save(pedido);
    const result = this.attachSequence(saved, false);

    // Si el pedido se completó o canceló, liberar la mesa si no hay más pedidos activos en ella
    if (result.mesa && (result.estado === 'Completado' || result.estado === 'Cancelado')) {
      const otherActive = await this.pedidoRepository.findOne({
        where: {
          mesa: result.mesa,
          estado: Not(In(['Completado', 'Cancelado'])),
        },
      });
      if (!otherActive) {
        await this.syncMesaStatus(result.mesa, 'libre');
      }
    }

    // Encolar comanda de adición si hay productos nuevos y autoPrint está activo
    if (autoPrint && newItemsToPrint && newItemsToPrint.length > 0) {
      console.log(`[PedidosService] Encolando comanda de adición (${newItemsToPrint.length} ítems) para pedido #${result.orderNumber || result.id}`);
      if (result.tipo === 'Domicilio') {
        this.impresionService
          .encolarComandaDomicilio(result, newItemsToPrint, true)
          .catch((err) => console.error('[PedidosService] Error encolando adición domicilio:', err.message));
      } else {
        this.impresionService
          .encolarComandaCocina(result, newItemsToPrint, true)
          .catch((err) => console.error('[PedidosService] Error encolando adición cocina:', err.message));
      }
    }

    realTimeEmitter.broadcast('pedido_updated', result);
    return result;
  }

  public async delete(id: string): Promise<boolean> {
    const pedido = await this.pedidoRepository.findOneBy({ id });
    const result = await this.pedidoRepository.delete(id);
    const affected = (result.affected ?? 0) > 0;
    if (affected) {
      if (pedido?.mesa) {
        const otherActive = await this.pedidoRepository.findOne({
          where: {
            mesa: pedido.mesa,
            estado: Not(In(['Completado', 'Cancelado'])),
          },
        });
        if (!otherActive) {
          await this.syncMesaStatus(pedido.mesa, 'libre');
        }
      }
      realTimeEmitter.broadcast('pedido_deleted', { id });
    }
    return affected;
  }
}
