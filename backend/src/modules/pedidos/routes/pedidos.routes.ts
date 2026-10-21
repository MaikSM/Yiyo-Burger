import { Router } from 'express';
import { PedidosController } from '../controllers/pedidos.controller';

export class PedidosRoutes {
  public router: Router;
  private controller: PedidosController;

  constructor() {
    this.router = Router();
    this.controller = new PedidosController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get('/events', this.controller.events.bind(this.controller));
    this.router.get('/', this.controller.getAll.bind(this.controller));
    this.router.post('/', this.controller.create.bind(this.controller));
    this.router.put('/:id', this.controller.update.bind(this.controller));
    this.router.delete('/:id', this.controller.delete.bind(this.controller));
  }
}
