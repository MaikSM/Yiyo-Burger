import { MesaEntity } from '../entities/mesa.entity';
import { CreateMesaDto } from '../dtos/create-mesa.dto';
import { UpdateMesaDto } from '../dtos/update-mesa.dto';
import { MesasService } from '../services/mesas.service';
import { ImpresionService, ImpresionItem } from '../../impresion/services/impresion.service';
import { SequenceService } from '../../impresion/services/sequence.service';

export class MesasController {
  private impresionService: ImpresionService;
  private sequenceService: SequenceService;

  constructor(private readonly mesasService: MesasService) {
    this.impresionService = new ImpresionService();
    this.sequenceService = SequenceService.getInstance();
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
    if (!pedidoInfo.orderNumber) {
      const seq = this.sequenceService.getOrderSequence(pedidoInfo.id, false);
      pedidoInfo.orderNumber = seq.orderNumber;
    }

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
    if (!pedidoInfo.orderNumber) {
      const seq = this.sequenceService.getOrderSequence(pedidoInfo.id, true);
      pedidoInfo.orderNumber = seq.orderNumber;
      pedidoInfo.domicilioNumber = seq.domicilioNumber;
    }

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
    if (!pedidoInfo.orderNumber) {
      const seq = this.sequenceService.getOrderSequence(pedidoInfo.id, pedidoInfo.tipo === 'Domicilio', false);
      if (seq.orderNumber) pedidoInfo.orderNumber = seq.orderNumber;
      if (seq.domicilioNumber) pedidoInfo.domicilioNumber = seq.domicilioNumber;
    }
    const success = await this.impresionService.imprimirFacturaCliente(pedidoInfo, targetTipo);
    return {
      success,
      message: 'Factura en cola de impresión',
    };
  }

  async imprimirPrecuenta(pedidoInfo: any, targetTipo?: 'Caja' | 'Parrilla'): Promise<any> {
    if (!pedidoInfo.orderNumber) {
      const seq = this.sequenceService.getOrderSequence(pedidoInfo.id, pedidoInfo.tipo === 'Domicilio', false);
      if (seq.orderNumber) pedidoInfo.orderNumber = seq.orderNumber;
    }
    const success = await this.impresionService.encolarPrecuenta(pedidoInfo, targetTipo);
    return {
      success,
      message: 'Pre-cuenta de mesa encolada exitosamente',
    };
  }
}
