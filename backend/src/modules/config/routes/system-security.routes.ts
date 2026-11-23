import { Router } from 'express';
import { SystemSecurityController } from '../controllers/system-security.controller';
import { getNetworkInfo } from '../../../core/utils/network-info.util';

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

    // Información de red local: la usan la app de tablet (para encontrar el servidor)
    // y el panel de administración (para mostrar IP y QR de conexión).
    this.router.get('/network-info', (_req, res) => {
      const port = parseInt(process.env.PORT || '4003', 10) || 4003;
      res.set('Cache-Control', 'no-store');
      res.json(getNetworkInfo(port));
    });
  }
}
