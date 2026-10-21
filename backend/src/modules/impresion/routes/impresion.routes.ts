import { Router } from 'express';
import { ImpresionController } from '../controllers/impresion.controller';

export class ImpresionRoutes {
  public router: Router;
  private impresionController: ImpresionController;

  constructor() {
    this.router = Router();
    this.impresionController = new ImpresionController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // POST /api/v1/impresion/cocina - Encolar comanda de cocina
    this.router.post('/cocina', (req, res) => this.impresionController.imprimirCocina(req, res));

    // POST /api/v1/impresion/domicilio - Encolar comanda de domicilio
    this.router.post('/domicilio', (req, res) => this.impresionController.imprimirDomicilio(req, res));

    // POST /api/v1/impresion/factura - Encolar comprobante/factura de venta
    this.router.post('/factura', (req, res) => this.impresionController.imprimirFactura(req, res));

    // POST /api/v1/impresion/precuenta - Encolar pre-cuenta informativa de mesa
    this.router.post('/precuenta', (req, res) => this.impresionController.imprimirPrecuenta(req, res));

    // POST /api/v1/impresion/cajon - Pulso de apertura de cajón
    this.router.post('/cajon', (req, res) => this.impresionController.abrirCaja(req, res));

    // POST /api/v1/impresion/probar - Diagnóstico de impresora
    this.router.post('/probar', (req, res) => this.impresionController.probarImpresora(req, res));

    // GET /api/v1/impresion/jobs - Historial y diagnóstico de cola
    this.router.get('/jobs', (req, res) => this.impresionController.getRecentJobs(req, res));

    // POST /api/v1/impresion/retry/:id - Reintento manual de ticket fallido
    this.router.post('/retry/:id', (req, res) => this.impresionController.retryJob(req, res));

    // POST /api/v1/impresion/retry-all - Reintento masivo de tickets fallidos
    this.router.post('/retry-all', (req, res) => this.impresionController.retryAll(req, res));
  }
}
