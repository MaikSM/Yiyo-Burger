import { Router } from 'express';
import { SystemSecurityController } from '../controllers/system-security.controller';

export class SystemSecurityRoutes {
  public router: Router;
  private controller: SystemSecurityController;

  constructor() {
    this.router = Router();
    this.controller = new SystemSecurityController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Endpoints públicos para consultar estado y desbloquear el sistema desde el Login
    this.router.get('/status', this.controller.getStatus);
    this.router.post('/unlock', this.controller.unlock);
    this.router.post('/change-password', this.controller.changePassword);
  }
}
