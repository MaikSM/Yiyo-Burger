import { Request, Response } from 'express';
import { GastosService } from '../services/gastos.service';

export class GastosController {
  private gastosService = new GastosService();

  public async getAll(req: Request, res: Response): Promise<void> {
    try {
      const fecha = req.query.fecha ? String(req.query.fecha) : undefined;
      const cierreId = req.query.cierre_id ? Number(req.query.cierre_id) : undefined;

      if (cierreId) {
        const gastos = await this.gastosService.getByCierre(cierreId);
        res.status(200).json(gastos);
        return;
      }

      if (fecha) {
        const gastos = await this.gastosService.getByFecha(fecha);
        res.status(200).json(gastos);
        return;
      }

      const gastos = await this.gastosService.getAll();
      res.status(200).json(gastos);
    } catch (error: any) {
      res.status(500).json({ message: 'Error al obtener gastos', error: error.message });
    }
  }

  public async create(req: Request, res: Response): Promise<void> {
    try {
      const nuevoGasto = await this.gastosService.create(req.body);
      res.status(201).json(nuevoGasto);
    } catch (error: any) {
      res.status(400).json({ message: 'Error al registrar gasto', error: error.message });
    }
  }

  public async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.gastosService.delete(id);
      if (!deleted) {
        res.status(404).json({ message: 'Gasto no encontrado' });
        return;
      }
      res.status(200).json({ message: 'Gasto eliminado correctamente' });
    } catch (error: any) {
      res.status(500).json({ message: 'Error al eliminar gasto', error: error.message });
    }
  }
}
