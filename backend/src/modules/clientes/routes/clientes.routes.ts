import { Router } from 'express';
import { ClientesController } from '../controllers/clientes.controller';

export class ClientesRoutes {
  public router: Router;
  private clientesController: ClientesController;

  constructor() {
    this.router = Router();
    this.clientesController = new ClientesController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get('/', this.clientesController.findAll.bind(this.clientesController));
    this.router.get('/:id', this.clientesController.findOne.bind(this.clientesController));
    this.router.post('/', this.clientesController.create.bind(this.clientesController));
    this.router.put('/:id', this.clientesController.update.bind(this.clientesController));
    this.router.delete('/:id', this.clientesController.delete.bind(this.clientesController));
  }
}
