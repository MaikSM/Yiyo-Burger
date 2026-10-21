import { Router } from 'express';
import { CierreCajaController } from '../controllers/cierre-caja.controller';

export class CierreCajaRoutes {
  public readonly router: Router;
  private readonly controller: CierreCajaController;

  constructor() {
    this.router = Router();
    this.controller = new CierreCajaController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get('/historial', this.controller.getHistorial);
    this.router.get('/turno-abierto', this.controller.getTurnoAbierto);
    this.router.post('/abrir', this.controller.abrirCaja);
    this.router.post('/:id/cerrar', this.controller.cerrarCaja);
  }
}
