import fs from 'fs';
import path from 'path';
import { DatabaseConnection } from '../../../core/database/DatabaseConnection';
import { DailySequenceEntity } from '../entities/daily-sequence.entity';
import { PedidoEntity } from '../../pedidos/entities/pedido.entity';

export interface DailySequenceData {
  date: string;
  global_count: number;
  domicilio_count: number;
  order_mapping: { [pedidoId: string]: number };
  domicilio_mapping: { [pedidoId: string]: number };
}

export class SequenceService {
  private static instance: SequenceService;
  private cache: DailySequenceData | null = null;
  private isDbSynced = false;

  public static getInstance(): SequenceService {
    if (!SequenceService.instance) {
      SequenceService.instance = new SequenceService();
    }
    return SequenceService.instance;
  }

  constructor() {
    if (SequenceService.instance) {
      return SequenceService.instance;
    }
    SequenceService.instance = this;
    this.syncFromDatabase().catch((err) =>
      console.warn('[SequenceService] Advertencia al sincronizar secuencia con BD:', err.message)
    );
  }

  private getConfigPath(): string {
    if (process.env.UPLOADS_PATH) {
      const userDataDir = path.dirname(process.env.UPLOADS_PATH);
      return path.join(userDataDir, 'order-sequence.json');
    }

    const localPath = path.join(process.cwd(), 'order-sequence.json');
    try {
      if (fs.existsSync(localPath)) return localPath;
      const testFile = path.join(process.cwd(), `.seq_test_${Date.now()}`);
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      return localPath;
    } catch (_) {
      const appData = process.env.APPDATA || process.env.USERPROFILE || process.env.HOME || process.cwd();
      const fallbackDir = path.join(appData, 'YiyoBurgerPOS');
      if (!fs.existsSync(fallbackDir)) {
        try {
          fs.mkdirSync(fallbackDir, { recursive: true });
        } catch (_) {}
      }
      return path.join(fallbackDir, 'order-sequence.json');
    }
  }

  private getCurrentDateString(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Sincroniza el contador con la base de datos SQLite para evitar reinicio a 1 si el servidor se reinicia.
   */
  public async syncFromDatabase(): Promise<void> {
    try {
      if (!DatabaseConnection.appDataSource.isInitialized) return;

      const today = this.getCurrentDateString();
      const seqRepo = DatabaseConnection.appDataSource.getRepository(DailySequenceEntity);
      const pedidoRepo = DatabaseConnection.appDataSource.getRepository(PedidoEntity);

      let seqRecord = await seqRepo.findOneBy({ date: today });

      // Consultar el valor máximo real de pedidos registrados hoy en la tabla de pedidos
      const maxOrderQuery = await pedidoRepo
        .createQueryBuilder('p')
        .select('MAX(p.orderNumber)', 'maxOrder')
        .addSelect('MAX(p.domicilioNumber)', 'maxDomi')
        .where('date(p.fecha) = date(:today) OR p.fecha >= :startOfDay', {
          today,
          startOfDay: `${today} 00:00:00`,
        })
        .getRawOne();

      const dbMaxOrder = Number(maxOrderQuery?.maxOrder) || 0;
      const dbMaxDomi = Number(maxOrderQuery?.maxDomi) || 0;

      const currentData = this.loadData();

      // Tomar el valor más alto entre la BD, el registro de secuencia y la memoria
      const highestGlobal = Math.max(currentData.global_count || 0, seqRecord?.global_count || 0, dbMaxOrder);
      const highestDomi = Math.max(currentData.domicilio_count || 0, seqRecord?.domicilio_count || 0, dbMaxDomi);

      currentData.date = today;
      currentData.global_count = highestGlobal;
      currentData.domicilio_count = highestDomi;

      this.cache = currentData;
      this.isDbSynced = true;

      // Guardar o actualizar en SQLite
      if (!seqRecord) {
        seqRecord = seqRepo.create({
          date: today,
          global_count: highestGlobal,
          domicilio_count: highestDomi,
        });
      } else {
        seqRecord.global_count = highestGlobal;
        seqRecord.domicilio_count = highestDomi;
      }
      await seqRepo.save(seqRecord);

      // Guardar en JSON como respaldo
      this.saveDataToJson(currentData);
      console.log(
        `[SequenceService] ✅ Secuencia diaria sincronizada para ${today}: Orden #${highestGlobal}, Domicilio #${highestDomi}`
      );
    } catch (err: any) {
      console.error('[SequenceService] Error en syncFromDatabase:', err.message);
    }
  }

  private loadData(): DailySequenceData {
    const today = this.getCurrentDateString();
    if (this.cache && this.cache.date === today) {
      return this.cache;
    }

    const configPath = this.getConfigPath();
    if (fs.existsSync(configPath)) {
      try {
        const data = fs.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(data);
        if (!parsed.domicilio_mapping) parsed.domicilio_mapping = {};
        if (parsed.date === today) {
          this.cache = parsed;
          return parsed;
        }
      } catch (e) {
        console.error('[SequenceService] Error leyendo order-sequence.json:', e);
      }
    }

    this.cache = {
      date: today,
      global_count: 0,
      domicilio_count: 0,
      order_mapping: {},
      domicilio_mapping: {},
    };
    return this.cache;
  }

  private saveDataToJson(data: DailySequenceData): void {
    const configPath = this.getConfigPath();
    try {
      const dir = path.dirname(configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn('[SequenceService] Error guardando respaldo JSON:', err.message);
    }
  }

  private persistToDbAsync(today: string, globalCount: number, domiCount: number): void {
    if (!DatabaseConnection.appDataSource.isInitialized) return;

    const seqRepo = DatabaseConnection.appDataSource.getRepository(DailySequenceEntity);
    seqRepo
      .save({
        date: today,
        global_count: globalCount,
        domicilio_count: domiCount,
      })
      .catch((err) => console.error('[SequenceService] Error auto-persistiendo secuencia en SQLite:', err.message));
  }

  /**
   * Obtiene el número de secuencia global para el día actual de forma atómica y segura.
   * Si el pedido ya tiene un número asignado hoy, devuelve el mismo número.
   * @param pedidoId ID único del pedido (ej. UUID)
   * @param isDomicilio true si es un pedido a domicilio
   * @param createIfMissing true para crear secuencia si no existe (por defecto true)
   */
  public getOrderSequence(
    pedidoId: string,
    isDomicilio: boolean = false,
    createIfMissing: boolean = true
  ): { orderNumber: number; domicilioNumber?: number } {
    const data = this.loadData();
    const today = this.getCurrentDateString();
    let isModified = false;

    // Si cambió de día, reiniciar contadores
    if (data.date !== today) {
      data.date = today;
      data.global_count = 0;
      data.domicilio_count = 0;
      data.order_mapping = {};
      data.domicilio_mapping = {};
      isModified = true;
    }

    let orderNum = data.order_mapping[pedidoId];
    let domNum = data.domicilio_mapping[pedidoId];

    // Asignar nuevo número global solo si se requiere crear cuando falta
    if (!orderNum && createIfMissing) {
      data.global_count += 1;
      orderNum = data.global_count;
      data.order_mapping[pedidoId] = orderNum;
      isModified = true;
    }

    if (isDomicilio) {
      if (!domNum && createIfMissing) {
        data.domicilio_count += 1;
        domNum = data.domicilio_count;
        data.domicilio_mapping[pedidoId] = domNum;
        isModified = true;
      }
    }

    if (isModified) {
      this.cache = data;
      this.saveDataToJson(data);
      this.persistToDbAsync(today, data.global_count, data.domicilio_count);
    }

    return { orderNumber: orderNum || 0, domicilioNumber: domNum };
  }

  public resetSequence(): void {
    const today = this.getCurrentDateString();
    const data = this.loadData();
    data.global_count = 0;
    data.domicilio_count = 0;
    data.order_mapping = {};
    data.domicilio_mapping = {};
    this.cache = data;
    this.saveDataToJson(data);
    this.persistToDbAsync(today, 0, 0);
  }
}
