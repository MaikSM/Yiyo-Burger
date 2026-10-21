import { MesaEntity } from '../entities/mesa.entity';
import { CreateMesaDto } from '../dtos/create-mesa.dto';
import { UpdateMesaDto } from '../dtos/update-mesa.dto';
import { IMesaRepository } from '../repositories/imesa.repository';
import { realTimeEmitter } from '../../../core/events/realtime.events';

export class MesasService {
  constructor(private readonly mesaRepository: IMesaRepository) {}

  async findAll(): Promise<MesaEntity[]> {
    return this.mesaRepository.findAll();
  }

  async findById(id: number): Promise<MesaEntity> {
    const mesa = await this.mesaRepository.findById(id);
    if (!mesa) {
      throw new Error(`Mesa con ID ${id} no encontrada`);
    }
    return mesa;
  }

  async create(createMesaDto: CreateMesaDto): Promise<MesaEntity> {
    const existingMesa = await this.mesaRepository.findByNumero(createMesaDto.numero);
    if (existingMesa) {
      throw new Error(`Ya existe una mesa con el número ${createMesaDto.numero}`);
    }
    const mesa = await this.mesaRepository.create(createMesaDto);
    return mesa;
  }

  async update(id: number, updateMesaDto: UpdateMesaDto): Promise<MesaEntity> {
    const mesa = await this.findById(id);
    const updatedMesa = await this.mesaRepository.update(id, {
      ...mesa,
      ...updateMesaDto,
    });
    return updatedMesa;
  }

  async delete(id: number): Promise<void> {
    const mesa = await this.findById(id);

    if (mesa.estado === 'ocupada') {
      throw new Error(
        `No se puede eliminar la mesa #${mesa.numero} porque está ocupada en este momento.`,
      );
    }

    try {
      const hasReservations = await this.mesaRepository.hasActiveReservations(id);
      if (hasReservations) {
        throw new Error(
          `No se puede eliminar la mesa #${mesa.numero} porque tiene reservas activas. Cancele todas las reservas primero.`,
        );
      }
    } catch (error: any) {
      if (error.message && error.message.includes('No se puede eliminar')) {
        throw error;
      }
    }

    await this.mesaRepository.delete(id);
  }

  async cambiarEstado(
    id: number,
    estado: 'libre' | 'reservada' | 'ocupada' | 'mantenimiento',
  ): Promise<MesaEntity> {
    const updated = await this.mesaRepository.cambiarEstado(id, estado);
    realTimeEmitter.broadcast('mesa_changed', { id, estado });
    return updated;
  }

  async findByEstado(
    estado: 'libre' | 'reservada' | 'ocupada' | 'mantenimiento',
  ): Promise<MesaEntity[]> {
    return this.mesaRepository.findByEstado(estado);
  }
}
