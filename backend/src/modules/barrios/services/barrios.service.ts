import { Repository } from 'typeorm';
import { DatabaseConnection } from '../../../core/database/DatabaseConnection';
import { BarrioEntity } from '../entities/barrio.entity';

export class BarriosService {
  private barrioRepo: Repository<BarrioEntity>;

  constructor() {
    this.barrioRepo = DatabaseConnection.appDataSource.getRepository(BarrioEntity);
  }

  async getAll(): Promise<BarrioEntity[]> {
    return await this.barrioRepo.find({ order: { nombre: 'ASC' } });
  }

  async getById(id: number): Promise<BarrioEntity | null> {
    return await this.barrioRepo.findOneBy({ id });
  }

  async create(data: Partial<BarrioEntity>): Promise<BarrioEntity> {
    const existing = await this.barrioRepo.findOne({
      where: { nombre: data.nombre },
    });
    if (existing) {
      throw new Error(`Ya existe un barrio configurado con el nombre ${data.nombre}`);
    }
    const barrio = this.barrioRepo.create(data);
    return await this.barrioRepo.save(barrio);
  }

  async update(id: number, data: Partial<BarrioEntity>): Promise<BarrioEntity> {
    const barrio = await this.getById(id);
    if (!barrio) {
      throw new Error('Barrio no encontrado');
    }
    Object.assign(barrio, data);
    return await this.barrioRepo.save(barrio);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.barrioRepo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
