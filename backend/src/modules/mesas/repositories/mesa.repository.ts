import { Repository, EntityRepository } from 'typeorm';
import { MesaEntity } from '../entities/mesa.entity';
import { IMesaRepository } from './imesa.repository';

export class MesaRepository implements IMesaRepository {
  constructor(private repository: Repository<MesaEntity>) {}

  async findAll(): Promise<MesaEntity[]> {
    return await this.repository.find({
      order: { numero: 'ASC' },
    });
  }

  async findById(id: number): Promise<MesaEntity | null> {
    return await this.repository.findOne({ where: { mesa_id: id } });
  }

  async findByNumero(numero: number): Promise<MesaEntity | null> {
    return await this.repository.findOne({ where: { numero } });
  }

  async findByEstado(
    estado: 'libre' | 'reservada' | 'ocupada' | 'mantenimiento',
  ): Promise<MesaEntity[]> {
    return await this.repository.find({
      where: { estado },
      order: { numero: 'ASC' },
    });
  }

  async create(mesa: Partial<MesaEntity>): Promise<MesaEntity> {
    const newMesa = this.repository.create(mesa);
    return await this.repository.save(newMesa);
  }

  async update(id: number, mesa: Partial<MesaEntity>): Promise<MesaEntity> {
    await this.repository.update(id, mesa);
    const updatedMesa = await this.findById(id);
    if (!updatedMesa) {
      throw new Error('Mesa no encontrada después de actualizar');
    }
    return updatedMesa;
  }

  async delete(id: number): Promise<void> {
    await this.repository.delete({ mesa_id: id });
  }

  async cambiarEstado(
    id: number,
    estado: 'libre' | 'reservada' | 'ocupada' | 'mantenimiento',
  ): Promise<MesaEntity> {
    await this.repository.update({ mesa_id: id }, { estado });
    const updatedMesa = await this.findById(id);
    if (!updatedMesa) {
      throw new Error('Mesa no encontrada después de cambiar estado');
    }
    return updatedMesa;
  }

  async countByEstado(
    estado: 'libre' | 'reservada' | 'ocupada' | 'mantenimiento',
  ): Promise<number> {
    return await this.repository.count({ where: { estado } });
  }

  async hasActiveReservations(id: number): Promise<boolean> {
    try {
      const count = await this.repository.manager.query(
        `SELECT COUNT(*) as cnt FROM reservas WHERE mesa_id = ? AND (estado = 'pendiente' OR estado = 'confirmado') AND deleted_at IS NULL`,
        [id]
      );
      return count && count[0] && Number(count[0].cnt || count[0]['COUNT(*)']) > 0;
    } catch (error) {
      return false;
    }
  }
}
