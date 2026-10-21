import { Request, Response } from 'express';
import { ImpresionService } from '../services/impresion.service';
import { PrintQueueService } from '../services/print-queue.service';

export class ImpresionController {
  private impresionService: ImpresionService;
  private printQueueService: PrintQueueService;

  constructor() {
    this.impresionService = new ImpresionService();
    this.printQueueService = PrintQueueService.getInstance();
  }

  public async imprimirCocina(req: Request, res: Response): Promise<void> {
    try {
      const { pedidoInfo, items, esAdicion } = req.body;
      if (!pedidoInfo || !items || !Array.isArray(items)) {
        res.status(400).json({ error: 'Faltan datos de pedidoInfo o items' });
        return;
      }
      const result = await this.impresionService.encolarComandaCocina(pedidoInfo, items, Boolean(esAdicion));
      res.status(200).json({
        success: true,
        message: 'Comanda encolada exitosamente para cocina',
        ...result,
      });
    } catch (err: any) {
      console.error('[ImpresionController] Error en imprimirCocina:', err.message);
      res.status(500).json({ error: 'Error al encolar comanda de cocina', details: err.message });
    }
  }

  public async imprimirDomicilio(req: Request, res: Response): Promise<void> {
    try {
      const { pedidoInfo, items, esAdicion } = req.body;
      if (!pedidoInfo || !items || !Array.isArray(items)) {
        res.status(400).json({ error: 'Faltan datos de pedidoInfo o items' });
        return;
      }
      const result = await this.impresionService.encolarComandaDomicilio(pedidoInfo, items, Boolean(esAdicion));
      res.status(200).json({
        success: true,
        message: 'Comanda de domicilio encolada exitosamente',
        ...result,
      });
    } catch (err: any) {
      console.error('[ImpresionController] Error en imprimirDomicilio:', err.message);
      res.status(500).json({ error: 'Error al encolar comanda de domicilio', details: err.message });
    }
  }

  public async imprimirFactura(req: Request, res: Response): Promise<void> {
    try {
      const { pedidoInfo, tipo } = req.body;
      if (!pedidoInfo) {
        res.status(400).json({ error: 'Faltan datos de pedidoInfo' });
        return;
      }
      await this.impresionService.encolarFacturaCliente(pedidoInfo, tipo || 'Caja');
      res.status(200).json({
        success: true,
        message: 'Factura encolada en la cola de impresión',
      });
    } catch (err: any) {
      console.error('[ImpresionController] Error en imprimirFactura:', err.message);
      res.status(500).json({ error: 'Error al encolar factura', details: err.message });
    }
  }

  public async imprimirPrecuenta(req: Request, res: Response): Promise<void> {
    try {
      const { pedidoInfo, tipo } = req.body;
      if (!pedidoInfo) {
        res.status(400).json({ error: 'Faltan datos de pedidoInfo' });
        return;
      }
      await this.impresionService.encolarPrecuenta(pedidoInfo, tipo || 'Caja');
      res.status(200).json({
        success: true,
        message: 'Pre-cuenta de mesa encolada exitosamente para la impresora principal',
      });
    } catch (err: any) {
      console.error('[ImpresionController] Error en imprimirPrecuenta:', err.message);
      res.status(500).json({ error: 'Error al encolar pre-cuenta', details: err.message });
    }
  }

  public async abrirCaja(req: Request, res: Response): Promise<void> {
    try {
      const { tipo } = req.body;
      await this.impresionService.encolarAperturaCaja(tipo || 'Caja');
      res.status(200).json({
        success: true,
        message: 'Pulso de apertura de cajón encolado exitosamente',
      });
    } catch (err: any) {
      console.error('[ImpresionController] Error en abrirCaja:', err.message);
      res.status(500).json({ error: 'Error al abrir caja registradora', details: err.message });
    }
  }

  public async probarImpresora(req: Request, res: Response): Promise<void> {
    try {
      const { tipo, customIp } = req.body;
      const result = await this.impresionService.probarImpresora(tipo || 'Caja', customIp);
      res.status(200).json(result);
    } catch (err: any) {
      console.error('[ImpresionController] Error en probarImpresora:', err.message);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public async getRecentJobs(req: Request, res: Response): Promise<void> {
    try {
      const limit = Number(req.query.limit) || 50;
      const jobs = await this.printQueueService.getRecentJobs(limit);
      const stats = await this.printQueueService.getQueueStats();
      res.status(200).json({ jobs, stats });
    } catch (err: any) {
      console.error('[ImpresionController] Error en getRecentJobs:', err.message);
      res.status(500).json({ error: 'Error al obtener trabajos de impresión', details: err.message });
    }
  }

  public async retryJob(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await this.printQueueService.retryJob(id);
      if (!success) {
        res.status(404).json({ error: 'Trabajo de impresión no encontrado' });
        return;
      }
      res.status(200).json({ success: true, message: 'Trabajo puesto en cola para reintento' });
    } catch (err: any) {
      console.error('[ImpresionController] Error en retryJob:', err.message);
      res.status(500).json({ error: 'Error al reintentar trabajo', details: err.message });
    }
  }

  public async retryAll(req: Request, res: Response): Promise<void> {
    try {
      const count = await this.printQueueService.retryAllFailed();
      res.status(200).json({
        success: true,
        count,
        message: `${count} trabajos fallidos reencolados para impresión`,
      });
    } catch (err: any) {
      console.error('[ImpresionController] Error en retryAll:', err.message);
      res.status(500).json({ error: 'Error al reintentar todos los trabajos', details: err.message });
    }
  }
}
