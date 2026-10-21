import { Repository } from 'typeorm';
import { DatabaseConnection } from '../../../core/database/DatabaseConnection';
import { PagoNominaEntity } from '../entities/pago-nomina.entity';
import { AsistenciaEntity } from '../entities/asistencia.entity';
import { UserEntity } from '../../user/entities/user.entity';
import { GastosService } from '../../config/services/gastos.service';

export class NominaBackendService {
  private pagoRepo: Repository<PagoNominaEntity>;
  private asistenciaRepo: Repository<AsistenciaEntity>;
  private userRepo: Repository<UserEntity>;
  private gastosService: GastosService;

  constructor() {
    this.pagoRepo = DatabaseConnection.appDataSource.getRepository(PagoNominaEntity);
    this.asistenciaRepo = DatabaseConnection.appDataSource.getRepository(AsistenciaEntity);
    this.userRepo = DatabaseConnection.appDataSource.getRepository(UserEntity);
    this.gastosService = new GastosService();
  }

  async getPagos(): Promise<PagoNominaEntity[]> {
    return await this.pagoRepo.find({
      order: { fecha: 'DESC', created_at: 'DESC' },
    });
  }

  async createPago(data: Partial<PagoNominaEntity>, registrarComoEgreso: boolean = true): Promise<PagoNominaEntity> {
    if (!data.user_id || !data.monto || Number(data.monto) <= 0) {
      throw new Error('Debe especificar un empleado válido y un monto mayor a 0');
    }

    const id = data.id || `pago-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const nuevoPago = this.pagoRepo.create({
      id,
      user_id: data.user_id,
      empleado_nombre: data.empleado_nombre || 'Empleado',
      fecha: data.fecha || new Date().toISOString().split('T')[0],
      dias_pagados: data.dias_pagados || 1,
      monto: Number(data.monto),
      metodo_pago: data.metodo_pago || 'Efectivo',
      observaciones: data.observaciones || '',
      registrado_como_gasto: registrarComoEgreso,
    });

    const guardado = await this.pagoRepo.save(nuevoPago);

    if (registrarComoEgreso) {
      try {
        await this.gastosService.create({
          fecha: guardado.fecha,
          monto: guardado.monto,
          metodo_pago: guardado.metodo_pago,
          motivo: `Nómina: ${guardado.empleado_nombre} (${guardado.dias_pagados} días)`,
          categoria: 'Nómina',
          usuario_nombre: 'Sistema de Nómina',
        });
      } catch (err) {
        console.warn('[NominaBackendService] No se pudo crear egreso automático:', err);
      }
    }

    return guardado;
  }

  async deletePago(id: string): Promise<boolean> {
    const res = await this.pagoRepo.delete(id);
    return (res.affected ?? 0) > 0;
  }

  async getAsistenciasMap(): Promise<Record<string, { user_id: number; nombre: string; hora_entrada?: string }[]>> {
    const asistencias = await this.asistenciaRepo.find({
      order: { fecha: 'ASC' },
    });
    const users = await this.userRepo.find();
    const userMap = new Map<number, string>();
    users.forEach(u => {
      userMap.set(u.id, `${u.name} ${u.surname || ''}`.trim().toUpperCase());
    });

    const map: Record<string, { user_id: number; nombre: string; hora_entrada?: string }[]> = {};

    for (const a of asistencias) {
      if (!map[a.fecha]) {
        map[a.fecha] = [];
      }
      map[a.fecha].push({
        user_id: a.user_id,
        nombre: userMap.get(a.user_id) || `ID:${a.user_id}`,
        hora_entrada: a.hora_entrada || '08:00',
      });
    }

    return map;
  }

  async saveAsistenciasDia(
    fecha: string,
    empleadosPresentes: { user_id: number; nombre?: string; hora_entrada?: string }[]
  ): Promise<void> {
    // Eliminar asistencias anteriores de esa fecha para re-escribir el estado de ese día
    await this.asistenciaRepo.delete({ fecha });

    if (!empleadosPresentes || empleadosPresentes.length === 0) {
      return;
    }

    const entidades = empleadosPresentes.map(emp => {
      return this.asistenciaRepo.create({
        user_id: emp.user_id,
        fecha: fecha,
        hora_entrada: emp.hora_entrada || '08:00',
        estado: 'presente',
      });
    });

    await this.asistenciaRepo.save(entidades);
  }
}
