import { Request, Response } from 'express';
import { SystemSecurityService } from '../services/system-security.service';

export class SystemSecurityController {
  private service: SystemSecurityService;

  constructor() {
    this.service = new SystemSecurityService();
  }

  public getStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const status = await this.service.getStatus();
      res.status(200).json(status);
    } catch (error: any) {
      console.error('Error al obtener estado de seguridad:', error);
      res.status(500).json({ message: 'Error interno del servidor', error: error.message });
    }
  };

  public unlock = async (req: Request, res: Response): Promise<void> => {
    try {
      const { password } = req.body;
      if (!password) {
        res.status(400).json({ success: false, message: 'La contraseña de seguridad es requerida.' });
        return;
      }

      const result = await this.service.unlock(password);
      if (!result.success) {
        res.status(401).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.error('Error al desbloquear sistema:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
    }
  };

  public changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await this.service.changeMasterPassword(currentPassword, newPassword);
      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.error('Error al cambiar contraseña de seguridad:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
    }
  };
}
