import { Repository, IsNull, Between, MoreThanOrEqual } from 'typeorm';
import { DatabaseConnection } from '../../../core/database/DatabaseConnection';
import { GastoEntity } from '../entities/gasto.entity';
import { CierreCajaEntity } from '../entities/cierre-caja.entity';
import { realTimeEmitter } from '../../../core/events/realtime.events';

export class GastosService {
  private gastoRepo: Repository<GastoEntity>;
  private cierreRepo: Repository<CierreCajaEntity>;

  constructor() {
    const ds = DatabaseConnection.appDataSource;
    this.gastoRepo = ds.getRepository(GastoEntity);
    this.cierreRepo = ds.getRepository(CierreCajaEntity);
  }

  private getLocalDateStr(dateInput?: Date | string): string {
    const d = dateInput ? new Date(dateInput) : new Date();
    const valid = isNaN(d.getTime()) ? new Date() : d;
    const year = valid.getFullYear();
    const month = String(valid.getMonth() + 1).padStart(2, '0');
    const day = String(valid.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    const cierre = await this.cierreRepo.findOneBy({ id: cierreId });
    if (!cierre) {
      return await this.gastoRepo.find({
        where: { cierre_id: cierreId },
        order: { created_at: 'DESC' },
      });
    }

    const fechaInicio = new Date(cierre.fecha_apertura);
    const fechaFin = cierre.fecha_cierre ? new Date(cierre.fecha_cierre) : null;
    const shiftDateStr = this.getLocalDateStr(fechaInicio);

    const gastos = await this.gastoRepo.find({
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

    const unique = new Map<string, GastoEntity>();
    for (const g of gastos) {
      if (g.cierre_id && Number(g.cierre_id) !== Number(cierreId)) continue;
      unique.set(g.id, g);
    }
    return Array.from(unique.values());
  }

  async create(data: Partial<GastoEntity>): Promise<GastoEntity> {
    if (!data.monto || Number(data.monto) <= 0) {
      throw new Error('El monto del gasto debe ser un número mayor a 0');
    }
    if (!data.motivo) {
      throw new Error('El motivo o concepto del gasto es requerido');
    }
    const todayStr = this.getLocalDateStr();
    if (!data.fecha) {
      data.fecha = todayStr;
    }

    let resolvedCierreId = data.cierre_id ? Number(data.cierre_id) : undefined;
    if (!resolvedCierreId) {
      try {
        const turnoAbierto = await this.cierreRepo.findOne({
          where: { estado: 'Abierto' },
          order: { fecha_apertura: 'DESC' },
        });
        if (turnoAbierto) {
          const shiftDateStr = this.getLocalDateStr(turnoAbierto.fecha_apertura);
          if (data.fecha === todayStr || data.fecha === shiftDateStr) {
            resolvedCierreId = turnoAbierto.id;
          }
        }
      } catch (_) {}
    }

    const nuevoGasto = this.gastoRepo.create({
      cierre_id: resolvedCierreId,
      fecha: data.fecha,
      monto: Number(data.monto),
      metodo_pago: data.metodo_pago || 'Efectivo',
      motivo: String(data.motivo).trim(),
      categoria: data.categoria || 'Operativo',
      usuario_nombre: data.usuario_nombre || 'Sistema',
    });

    const saved = await this.gastoRepo.save(nuevoGasto);
    realTimeEmitter.broadcast('gasto_changed' as any, saved);
    return saved;
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.gastoRepo.delete(id);
    const deleted = (res.affected ?? 0) > 0;
    if (deleted) {
      realTimeEmitter.broadcast('gasto_changed' as any, { id, deleted: true });
    }
    return deleted;
  }
}
