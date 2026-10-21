import { Repository, MoreThan } from 'typeorm';
import { DatabaseConnection } from '../../../core/database/DatabaseConnection';
import { PrintJobEntity, PrintJobType, PrintJobStatus } from '../entities/print-job.entity';
import { realTimeEmitter } from '../../../core/events/realtime.events';
import { ConfigService } from '../../config/services/config.service';

const escpos = require('escpos');
escpos.Network = require('escpos-network');

export interface EnqueueJobOptions {
  pedido_id?: string;
  tipo_ticket: PrintJobType;
  destino: string;
  payload: any;
  max_intentos?: number;
}

export class PrintQueueService {
  private static instance: PrintQueueService;
  private jobRepo!: Repository<PrintJobEntity>;
  private configService: ConfigService;

  // Controladores de cola FIFO en memoria por destino (IP o Spooler)
  private activeWorkers: Set<string> = new Set();
  private interJobDelayMs = 300; // 300ms de guarda térmica entre trabajos para el mismo destino
  private isInitialized = false;

  public static getInstance(): PrintQueueService {
    if (!PrintQueueService.instance) {
      PrintQueueService.instance = new PrintQueueService();
    }
    return PrintQueueService.instance;
  }

  constructor() {
    this.configService = new ConfigService();
  }

  private getRepository(): Repository<PrintJobEntity> {
    if (!this.jobRepo) {
      this.jobRepo = DatabaseConnection.appDataSource.getRepository(PrintJobEntity);
    }
    return this.jobRepo;
  }

  /**
   * Inicializa el servicio de cola y procesa trabajos pendientes huérfanos tras reinicio.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;
    try {
      const repo = this.getRepository();
      // Restaurar trabajos que quedaron en estado 'imprimiendo' por un cierre abrupto
      await repo
        .createQueryBuilder()
        .update(PrintJobEntity)
        .set({ estado: 'pendiente' })
        .where('estado = :estado', { estado: 'imprimiendo' })
        .execute();

      this.isInitialized = true;
      console.log('[PrintQueue] Motor de cola de impresión inicializado correctamente.');

      // Disparar procesamiento de trabajos pendientes
      this.triggerPendingJobs();
    } catch (err: any) {
      console.error('[PrintQueue] Error inicializando motor de cola de impresión:', err.message);
    }
  }

  /**
   * Encola un nuevo trabajo de impresión de manera persistente en SQLite.
   * Cuenta con deduplicación por idempotencia para evitar comandas duplicadas por doble clic o reintentos HTTP.
   */
  public async enqueue(options: EnqueueJobOptions): Promise<PrintJobEntity> {
    const repo = this.getRepository();

    // Verificación de idempotencia (15 segundos para el mismo pedido y tipo de ticket)
    if (options.pedido_id && options.tipo_ticket !== 'prueba' && options.tipo_ticket !== 'cajon') {
      const fifteenSecondsAgo = new Date(Date.now() - 15000);
      const existingJob = await repo.findOne({
        where: {
          pedido_id: options.pedido_id,
          tipo_ticket: options.tipo_ticket,
          created_at: MoreThan(fifteenSecondsAgo),
        },
      });

      if (existingJob) {
        console.log(
          `[PrintQueue] ⚠️ Trabajo duplicado ignorado por idempotencia (pedido ${options.pedido_id}, tipo ${options.tipo_ticket}).`
        );
        return existingJob;
      }
    }

    const job = repo.create({
      pedido_id: options.pedido_id,
      tipo_ticket: options.tipo_ticket,
      destino: (options.destino || '').trim(),
      payload: options.payload || {},
      estado: 'pendiente',
      intentos: 0,
      max_intentos: options.max_intentos || 3,
    });

    const savedJob = await repo.save(job);
    console.log(
      `[PrintQueue] Trabajo #${savedJob.id.slice(0, 8)} encolado para [${savedJob.tipo_ticket}] -> Destino: "${savedJob.destino}"`
    );

    // Disparar worker para este destino
    this.processQueueForDestination(savedJob.destino);

    return savedJob;
  }

  /**
   * Busca destinos con trabajos pendientes e inicia sus workers respectivos.
   */
  public async triggerPendingJobs(): Promise<void> {
    try {
      const repo = this.getRepository();
      const pendingDestinations = await repo
        .createQueryBuilder('job')
        .select('DISTINCT job.destino', 'destino')
        .where('job.estado = :estado', { estado: 'pendiente' })
        .getRawMany();

      for (const row of pendingDestinations) {
        if (row.destino) {
          this.processQueueForDestination(row.destino);
        }
      }
    } catch (err: any) {
      console.error('[PrintQueue] Error buscando destinos pendientes:', err.message);
    }
  }

  /**
   * Procesa la cola de forma estrictamente secuencial (FIFO) para un destino dado.
   */
  private async processQueueForDestination(destino: string): Promise<void> {
    const cleanDestino = (destino || '').trim();
    if (!cleanDestino) return;

    // Si ya hay un worker ejecutando trabajos para este destino, salimos (garantía FIFO)
    if (this.activeWorkers.has(cleanDestino)) {
      return;
    }

    this.activeWorkers.add(cleanDestino);

    try {
      const repo = this.getRepository();

      while (true) {
        // Tomar el siguiente trabajo más antiguo en estado 'pendiente' para este destino
        const nextJob = await repo.findOne({
          where: {
            destino: cleanDestino,
            estado: 'pendiente',
          },
          order: {
            created_at: 'ASC',
          },
        });

        if (!nextJob) {
          // No hay más trabajos pendientes para este destino
          break;
        }

        // Marcar como imprimiendo
        nextJob.estado = 'imprimiendo';
        nextJob.intentos += 1;
        await repo.save(nextJob);

        console.log(
          `[PrintQueue] Ejecutando trabajo #${nextJob.id.slice(0, 8)} (${nextJob.tipo_ticket}) - Intento ${nextJob.intentos}/${nextJob.max_intentos}...`
        );

        let success = false;
        let errorMessage = '';

        try {
          success = await this.executePrintJob(nextJob);
        } catch (execErr: any) {
          success = false;
          errorMessage = execErr.message || 'Error desconocido durante impresión';
        }

        if (success) {
          nextJob.estado = 'impreso';
          nextJob.printed_at = new Date();
          nextJob.ultimo_error = undefined;
          await repo.save(nextJob);
          console.log(`[PrintQueue] ✅ Trabajo #${nextJob.id.slice(0, 8)} impreso con éxito.`);

          realTimeEmitter.broadcast('impresion_exitosa' as any, {
            jobId: nextJob.id,
            pedidoId: nextJob.pedido_id,
            tipo: nextJob.tipo_ticket,
            destino: cleanDestino,
          });
        } else {
          console.error(
            `[PrintQueue] ❌ Falló trabajo #${nextJob.id.slice(0, 8)} en intento ${nextJob.intentos}/${nextJob.max_intentos}. Error: ${errorMessage || 'Sin respuesta'}`
          );
          nextJob.ultimo_error = errorMessage || 'Fallo de conexión o timeout con la impresora';

          if (nextJob.intentos >= nextJob.max_intentos) {
            nextJob.estado = 'fallido';
            await repo.save(nextJob);

            console.error(
              `[PrintQueue] 🚨 TRABAJO #${nextJob.id.slice(0, 8)} MARCADO COMO FALLIDO TRAS AGOTAR REINTENTOS.`
            );

            // Alerta inmediata en tiempo real al frontend para notificar a caja/cocina
            realTimeEmitter.broadcast('impresion_fallida' as any, {
              jobId: nextJob.id,
              pedidoId: nextJob.pedido_id,
              tipo: nextJob.tipo_ticket,
              destino: cleanDestino,
              error: nextJob.ultimo_error,
            });
          } else {
            // Reintento: volver a estado pendiente y esperar backoff
            nextJob.estado = 'pendiente';
            await repo.save(nextJob);

            const backoffMs = nextJob.intentos * 1500;
            console.log(`[PrintQueue] Esperando backoff de ${backoffMs}ms antes del próximo intento...`);
            await new Promise((res) => setTimeout(res, backoffMs));
          }
        }

        // Retardo de seguridad inter-socket para permitir que la impresora cierre conexión TCP limpiamente
        await new Promise((res) => setTimeout(res, this.interJobDelayMs));
      }
    } catch (err: any) {
      console.error(`[PrintQueue] Error inesperado en worker de destino "${cleanDestino}":`, err.message);
    } finally {
      this.activeWorkers.delete(cleanDestino);
    }
  }

  /**
   * Ejecuta físicamente el trabajo de impresión llamando al hardware de red ESC/POS o al Spooler de Windows.
   */
  private async executePrintJob(job: PrintJobEntity): Promise<boolean> {
    const { tipo_ticket, destino, payload } = job;
    const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(destino.trim());

    // Importación dinámica limpia para evitar dependencias circulares
    const { ImpresionService } = require('./impresion.service');
    const impresionService = new ImpresionService();

    switch (tipo_ticket) {
      case 'cocina_pizzas':
        return await impresionService.imprimirTicketCocinaDirecto(payload.pedido, payload.items || [], 'Pizzas', destino);

      case 'cocina_parrilla':
        return await impresionService.imprimirTicketCocinaDirecto(payload.pedido, payload.items || [], 'Parrilla', destino);

      case 'domicilio':
        return await impresionService.imprimirTicketDomicilioDirecto(payload.pedido, payload.items || [], payload.tipo || 'Parrilla', destino);

      case 'factura':
        return await impresionService.imprimirFacturaClienteDirecto(payload.pedido, destino);

      case 'precuenta':
        return await impresionService.imprimirPrecuentaDirecto(payload.pedido, destino);

      case 'cajon':
        return await impresionService.abrirCajaDirecto(destino);

      case 'prueba':
        const resPrueba = await impresionService.probarImpresoraDirecto(payload.tipo || 'Caja', destino);
        return resPrueba.success;

      default:
        console.warn(`[PrintQueue] Tipo de ticket desconocido: ${tipo_ticket}`);
        return false;
    }
  }

  /**
   * Reintenta manualmente un trabajo de impresión fallido.
   */
  public async retryJob(jobId: string): Promise<boolean> {
    const repo = this.getRepository();
    const job = await repo.findOneBy({ id: jobId });
    if (!job) return false;

    job.estado = 'pendiente';
    job.intentos = 0; // Resetear intentos
    job.ultimo_error = undefined;
    await repo.save(job);

    this.processQueueForDestination(job.destino);
    return true;
  }

  /**
   * Reintenta todos los trabajos que se encuentren en estado fallido.
   */
  public async retryAllFailed(): Promise<number> {
    const repo = this.getRepository();
    const failedJobs = await repo.find({ where: { estado: 'fallido' } });
    if (failedJobs.length === 0) return 0;

    for (const job of failedJobs) {
      job.estado = 'pendiente';
      job.intentos = 0;
      job.ultimo_error = undefined;
      await repo.save(job);
    }

    this.triggerPendingJobs();
    return failedJobs.length;
  }

  /**
   * Lista los últimos trabajos de impresión para diagnóstico y monitoreo en el POS.
   */
  public async getRecentJobs(limit: number = 50): Promise<PrintJobEntity[]> {
    const repo = this.getRepository();
    return await repo.find({
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  /**
   * Obtiene la cantidad de trabajos pendientes o con fallas para indicadores en el frontend.
   */
  public async getQueueStats(): Promise<{ pendientes: number; fallidos: number; imprimiendo: number }> {
    const repo = this.getRepository();
    const pendientes = await repo.count({ where: { estado: 'pendiente' } });
    const fallidos = await repo.count({ where: { estado: 'fallido' } });
    const imprimiendo = await repo.count({ where: { estado: 'imprimiendo' } });
    return { pendientes, fallidos, imprimiendo };
  }
}
