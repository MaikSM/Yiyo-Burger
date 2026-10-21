import { Request, Response } from 'express';
import { BarriosService } from '../services/barrios.service';

export class BarriosController {
  private service: BarriosService;

  constructor() {
    this.service = new BarriosService();
  }

  public getAll = async (_req: Request, res: Response): Promise<Response> => {
    try {
      const barrios = await this.service.getAll();
      return res.status(200).json(barrios);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al obtener barrios', error: error.message });
    }
  };

  public create = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { nombre, precio } = req.body;
      if (!nombre) {
        return res.status(400).json({ message: 'El nombre del barrio es obligatorio' });
      }
      const nuevoBarrio = await this.service.create({
        nombre: nombre.trim(),
        precio: parseFloat(precio || 0),
      });
      return res.status(201).json(nuevoBarrio);
    } catch (error: any) {
      return res.status(400).json({ message: error.message || 'Error al crear barrio', error: error.message });
    }
  };

  public update = async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = parseInt(req.params.id);
      const updated = await this.service.update(id, req.body);
      return res.status(200).json(updated);
    } catch (error: any) {
      return res.status(400).json({ message: error.message || 'Error al actualizar barrio', error: error.message });
    }
  };

  public delete = async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await this.service.delete(id);
      if (!deleted) {
        return res.status(404).json({ message: 'Barrio no encontrado' });
      }
      return res.status(200).json({ message: 'Barrio eliminado correctamente' });
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al eliminar barrio', error: error.message });
    }
  };
}
