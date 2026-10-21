import { Repository } from 'typeorm';
import { DatabaseConnection } from '../../../core/database/DatabaseConnection';
import { GastoEntity } from '../entities/gasto.entity';

export class GastosService {
  private gastoRepo: Repository<GastoEntity>;

  constructor() {
    this.gastoRepo = DatabaseConnection.appDataSource.getRepository(GastoEntity);
  }

  async getAll(): Promise<GastoEntity[]> {
    return await this.gastoRepo.find({
      order: { created_at: 'DESC' },
    });
  }

  async getByFecha(fecha: string): Promise<GastoEntity[]> {
    return await this.gastoRepo.find({
      where: { fecha },
      order: { created_at: 'ASC' },
    });
  }

  async getByCierre(cierreId: number): Promise<GastoEntity[]> {
    return await this.gastoRepo.find({
      where: { cierre_id: cierreId },
      order: { created_at: 'ASC' },
    });
  }

  async create(data: Partial<GastoEntity>): Promise<GastoEntity> {
    if (!data.monto || Number(data.monto) <= 0) {
      throw new Error('El monto del gasto debe ser un número mayor a 0');
    }
    if (!data.motivo) {
      throw new Error('El motivo o concepto del gasto es requerido');
    }
    if (!data.fecha) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      data.fecha = `${year}-${month}-${day}`;
    }

    const nuevoGasto = this.gastoRepo.create({
      cierre_id: data.cierre_id || undefined,
      fecha: data.fecha,
      monto: Number(data.monto),
      metodo_pago: data.metodo_pago || 'Efectivo',
      motivo: data.motivo,
      categoria: data.categoria || 'Otros',
      usuario_nombre: data.usuario_nombre || 'Sistema',
    });

    return await this.gastoRepo.save(nuevoGasto);
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.gastoRepo.delete(id);
    return (res.affected ?? 0) > 0;
  }
}
