import { Router } from 'express';
import { BarriosController } from '../controllers/barrios.controller';

export class BarriosRoutes {
  public router: Router;
  private controller: BarriosController;

  constructor() {
    this.router = Router();
    this.controller = new BarriosController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get('/', this.controller.getAll);
    this.router.post('/', this.controller.create);
    this.router.put('/:id', this.controller.update);
    this.router.patch('/:id', this.controller.update);
    this.router.delete('/:id', this.controller.delete);
  }
}
