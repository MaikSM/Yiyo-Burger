import { MesaEntity } from '../entities/mesa.entity';
import { CreateMesaDto } from '../dtos/create-mesa.dto';
import { UpdateMesaDto } from '../dtos/update-mesa.dto';
import { MesasService } from '../services/mesas.service';
import { ImpresionService } from '../../impresion/services/impresion.service';
import { SequenceService } from '../../impresion/services/sequence.service';
import { DatabaseConnection } from '../../../core/database/DatabaseConnection';
import { PedidoEntity } from '../../pedidos/entities/pedido.entity';

export class MesasController {
  private impresionService: ImpresionService;
  private sequenceService: SequenceService;

  constructor(private readonly mesasService: MesasService) {
    this.impresionService = new ImpresionService();
    this.sequenceService = SequenceService.getInstance();
  }

  private async ensureOrderNumbers(pedidoInfo: any, createIfMissing: boolean = false): Promise<void> {
    if (!pedidoInfo) return;
    const isDomi = pedidoInfo.tipo === 'Domicilio';

    if ((!pedidoInfo.orderNumber || (isDomi && !pedidoInfo.domicilioNumber)) && pedidoInfo.id) {
      const seq = this.sequenceService.getOrderSequence(String(pedidoInfo.id), isDomi, false);
      if (seq.orderNumber && !pedidoInfo.orderNumber) pedidoInfo.orderNumber = seq.orderNumber;
      if (seq.domicilioNumber && !pedidoInfo.domicilioNumber) pedidoInfo.domicilioNumber = seq.domicilioNumber;

      if (!pedidoInfo.orderNumber || (isDomi && !pedidoInfo.domicilioNumber)) {
        try {
          const repo = DatabaseConnection.appDataSource.getRepository(PedidoEntity);
          const dbOrder = await repo.findOneBy({ id: String(pedidoInfo.id) });
          if (dbOrder) {
            if (dbOrder.orderNumber && !pedidoInfo.orderNumber) pedidoInfo.orderNumber = dbOrder.orderNumber;
            if (dbOrder.domicilioNumber && !pedidoInfo.domicilioNumber) {
              pedidoInfo.domicilioNumber = dbOrder.domicilioNumber;
            }
            this.sequenceService.bindOrderId(
              String(dbOrder.id),
              String(dbOrder.id),
              dbOrder.orderNumber,
              dbOrder.domicilioNumber
            );
          }
        } catch (_) {}
      }
    }

    if (!pedidoInfo.orderNumber && createIfMissing && pedidoInfo.id) {
      const seq = this.sequenceService.getOrderSequence(String(pedidoInfo.id), isDomi, true);
      if (seq.orderNumber) pedidoInfo.orderNumber = seq.orderNumber;
      if (seq.domicilioNumber) pedidoInfo.domicilioNumber = seq.domicilioNumber;
    }
  }

  async findAll(): Promise<MesaEntity[]> {
    return this.mesasService.findAll();
  }

  async findById(id: number): Promise<MesaEntity> {
    return this.mesasService.findById(id);
  }

  async create(createMesaDto: CreateMesaDto): Promise<MesaEntity> {
    return this.mesasService.create(createMesaDto);
  }

  async update(id: number, updateMesaDto: UpdateMesaDto): Promise<MesaEntity> {
    return this.mesasService.update(id, updateMesaDto);
  }

  async delete(id: number): Promise<void> {
    return this.mesasService.delete(id);
  }

  async cambiarEstado(
    id: number,
    estado: 'libre' | 'reservada' | 'ocupada' | 'mantenimiento',
  ): Promise<MesaEntity> {
    return this.mesasService.cambiarEstado(id, estado);
  }

  async findByEstado(
    estado: 'libre' | 'reservada' | 'ocupada' | 'mantenimiento',
  ): Promise<MesaEntity[]> {
    return this.mesasService.findByEstado(estado);
  }

  async confirmarPedido(pedidoInfo: any, items: any[]): Promise<any> {
    await this.ensureOrderNumbers(pedidoInfo, true);

    const result = await this.impresionService.encolarComandaCocina(
      pedidoInfo,
      items,
      Boolean(pedidoInfo.esAdicion)
    );

    return {
      success: true,
      message: 'Pedido confirmado y encolado a impresoras',
      orderNumber: pedidoInfo.orderNumber,
      ...result,
    };
  }

  async confirmarDomicilio(pedidoInfo: any, items: any[]): Promise<any> {
    await this.ensureOrderNumbers(pedidoInfo, true);

    const result = await this.impresionService.encolarComandaDomicilio(
      pedidoInfo,
      items,
      Boolean(pedidoInfo.esAdicion)
    );

    return {
      success: true,
      message: 'Domicilio confirmado y encolado a impresión',
      orderNumber: pedidoInfo.orderNumber,
      ...result,
    };
  }

  async abrirCaja(): Promise<any> {
    const success = await this.impresionService.abrirCaja();
    return { success };
  }

  async imprimirFactura(pedidoInfo: any, targetTipo?: 'Caja' | 'Parrilla'): Promise<any> {
    await this.ensureOrderNumbers(pedidoInfo, false);
    const success = await this.impresionService.imprimirFacturaCliente(
      { ...pedidoInfo, esReimpresion: true },
      targetTipo
    );
    return {
      success,
      message: 'Factura en cola de impresión',
    };
  }

  async imprimirPrecuenta(pedidoInfo: any, targetTipo?: 'Caja' | 'Parrilla'): Promise<any> {
    await this.ensureOrderNumbers(pedidoInfo, false);
    const success = await this.impresionService.encolarPrecuenta(
      { ...pedidoInfo, esReimpresion: true },
      targetTipo
    );
    return {
      success,
      message: 'Pre-cuenta de mesa encolada exitosamente',
    };
  }
}
