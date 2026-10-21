import { Repository } from 'typeorm';
import { SystemSecurityEntity } from '../entities/system-security.entity';
import { DatabaseConnection } from '../../../core/database/DatabaseConnection';

export class SystemSecurityService {
  private repository: Repository<SystemSecurityEntity>;

  constructor() {
    this.repository = DatabaseConnection.appDataSource.getRepository(SystemSecurityEntity);
  }

  private async getOrCreateRecord(): Promise<SystemSecurityEntity> {
    let record = await this.repository.findOne({ where: { id: 1 } });
    if (!record) {
      const defaultPassword = process.env.SYSTEM_SECURITY_PASSWORD || 'Yiyo2026Security';
      record = this.repository.create({
        id: 1,
        master_password: defaultPassword,
        last_unlocked_cycle: '',
      });
      await this.repository.save(record);
    }
    return record;
  }

  public getCurrentRequiredCycle(now: Date = new Date()): string {
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    const day = now.getDate();

    if (day >= 29) {
      return `${year}-${String(month).padStart(2, '0')}`;
    } else {
      const prevDate = new Date(year, now.getMonth() - 1, 1);
      const prevYear = prevDate.getFullYear();
      const prevMonth = prevDate.getMonth() + 1;
      return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    }
  }

  public async getStatus(): Promise<{ isLocked: boolean; currentCycle: string; lockDay: number; message: string }> {
    const record = await this.getOrCreateRecord();
    const currentCycle = this.getCurrentRequiredCycle();
    
    const isLocked = !record.last_unlocked_cycle || record.last_unlocked_cycle < currentCycle;

    return {
      isLocked,
      currentCycle,
      lockDay: 29,
      message: isLocked
        ? 'El sistema está bloqueado. Ingrese la contraseña de seguridad para renovar el acceso mensual (Día 29).'
        : 'El sistema está activo y desbloqueado.',
    };
  }

  public async unlock(password: string): Promise<{ success: boolean; message: string }> {
    const record = await this.getOrCreateRecord();
    
    if (password !== record.master_password) {
      return {
        success: false,
        message: 'Contraseña de seguridad incorrecta.',
      };
    }

    const currentCycle = this.getCurrentRequiredCycle();
    record.last_unlocked_cycle = currentCycle;
    await this.repository.save(record);

    return {
      success: true,
      message: 'Sistema desbloqueado correctamente para el ciclo actual.',
    };
  }

  public async changeMasterPassword(currentPass: string, newPass: string): Promise<{ success: boolean; message: string }> {
    const record = await this.getOrCreateRecord();

    if (currentPass !== record.master_password) {
      return {
        success: false,
        message: 'La contraseña de seguridad actual es incorrecta.',
      };
    }

    if (!newPass || newPass.trim().length < 4) {
      return {
        success: false,
        message: 'La nueva contraseña de seguridad debe tener al menos 4 caracteres.',
      };
    }

    record.master_password = newPass.trim();
    await this.repository.save(record);

    return {
      success: true,
      message: 'Contraseña de seguridad actualizada correctamente.',
    };
  }
}
