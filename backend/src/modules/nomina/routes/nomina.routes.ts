import { Router } from 'express';
import { NominaController } from '../controllers/nomina.controller';

export class NominaRoutes {
  public readonly router: Router;
  private readonly controller: NominaController;

  constructor() {
    this.router = Router();
    this.controller = new NominaController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get('/pagos', this.controller.getPagos.bind(this.controller));
    this.router.post('/pagos', this.controller.createPago.bind(this.controller));
    this.router.delete('/pagos/:id', this.controller.deletePago.bind(this.controller));

    this.router.get('/asistencias', this.controller.getAsistencias.bind(this.controller));
    this.router.post('/asistencias', this.controller.saveAsistenciasDia.bind(this.controller));
  }
}
