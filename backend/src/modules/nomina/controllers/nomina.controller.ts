import { Request, Response } from 'express';
import { NominaBackendService } from '../services/nomina.service';

export class NominaController {
  private nominaService = new NominaBackendService();

  public async getPagos(req: Request, res: Response): Promise<void> {
    try {
      const pagos = await this.nominaService.getPagos();
      res.status(200).json(pagos);
    } catch (error: any) {
      res.status(500).json({ message: 'Error al obtener pagos de nómina', error: error.message });
    }
  }

  public async createPago(req: Request, res: Response): Promise<void> {
    try {
      const { pagoData, registrarComoEgreso } = req.body;
      const dataToSave = pagoData || req.body;
      const registrarGasto = registrarComoEgreso !== undefined ? registrarComoEgreso : true;

      const nuevoPago = await this.nominaService.createPago(dataToSave, registrarGasto);
      res.status(201).json(nuevoPago);
    } catch (error: any) {
      res.status(400).json({ message: 'Error al crear pago de nómina', error: error.message });
    }
  }

  public async deletePago(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.nominaService.deletePago(id);
      if (!deleted) {
        res.status(404).json({ message: 'Pago de nómina no encontrado' });
        return;
      }
      res.status(200).json({ message: 'Pago de nómina eliminado correctamente' });
    } catch (error: any) {
      res.status(500).json({ message: 'Error al eliminar pago de nómina', error: error.message });
    }
  }

  public async getAsistencias(req: Request, res: Response): Promise<void> {
    try {
      const map = await this.nominaService.getAsistenciasMap();
      res.status(200).json(map);
    } catch (error: any) {
      res.status(500).json({ message: 'Error al obtener asistencias', error: error.message });
    }
  }

  public async saveAsistenciasDia(req: Request, res: Response): Promise<void> {
    try {
      const { fecha, empleadosPresentes } = req.body;
      if (!fecha) {
        res.status(400).json({ message: 'La fecha es requerida' });
        return;
      }
      await this.nominaService.saveAsistenciasDia(fecha, empleadosPresentes || []);
      res.status(200).json({ message: 'Asistencias del día actualizadas correctamente' });
    } catch (error: any) {
      res.status(500).json({ message: 'Error al guardar asistencias', error: error.message });
    }
  }
}
