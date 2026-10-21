import { Router } from 'express';
import { GastosController } from '../controllers/gastos.controller';

export class GastosRoutes {
  public router: Router;
  private gastosController: GastosController;

  constructor() {
    this.router = Router();
    this.gastosController = new GastosController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // GET /api/v1/gastos
    this.router.get('/', (req, res) => this.gastosController.getAll(req, res));

    // POST /api/v1/gastos
    this.router.post('/', (req, res) => this.gastosController.create(req, res));

    // DELETE /api/v1/gastos/:id
    this.router.delete('/:id', (req, res) => this.gastosController.delete(req, res));
  }

  getRouter(): Router {
    return this.router;
  }
}
