import { Request, Response } from 'express';
import { CierreCajaService } from '../services/cierre-caja.service';

export class CierreCajaController {
  private service: CierreCajaService;

  constructor() {
    this.service = new CierreCajaService();
  }

  public getHistorial = async (_req: Request, res: Response): Promise<Response> => {
    try {
      const cierres = await this.service.getHistorial();
      return res.status(200).json(cierres);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error fetching closure history', error: error.message });
    }
  };

  public getTurnoAbierto = async (_req: Request, res: Response): Promise<Response> => {
    try {
      const turno = await this.service.getTurnoAbierto();
      if (!turno) return res.status(200).json({ abierto: false, data: null });
      
      const resumen = await this.service.obtenerResumenTurno(turno.id);
      return res.status(200).json({ abierto: true, data: resumen });
    } catch (error: any) {
      return res.status(500).json({ message: 'Error fetching active shift', error: error.message });
    }
  };

  public abrirCaja = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { usuario_id, usuario_nombre, monto_inicial } = req.body;
      if (monto_inicial === undefined || monto_inicial === null) {
        return res.status(400).json({ message: 'El monto inicial es obligatorio' });
      }

      const usuarioId = usuario_id ? parseInt(usuario_id) : 1;
      const usuarioNombre = usuario_nombre || 'Cajero Central';
      const monto = parseFloat(monto_inicial);

      const nuevoTurno = await this.service.abrirCaja(usuarioId, usuarioNombre, monto);
      return res.status(201).json(nuevoTurno);
    } catch (error: any) {
      return res.status(400).json({ message: error.message || 'Error al abrir el turno de caja', error: error.message });
    }
  };

  public cerrarCaja = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const { monto_real_contado, notas } = req.body;

      if (monto_real_contado === undefined || monto_real_contado === null) {
        return res.status(400).json({ message: 'El monto real contado en efectivo es obligatorio' });
      }

      const cierreId = parseInt(id);
      const montoReal = parseFloat(monto_real_contado);

      const turnoCerrado = await this.service.cerrarCaja(cierreId, montoReal, notas);
      return res.status(200).json({
        message: 'Turno de caja cerrado exitosamente',
        data: turnoCerrado,
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || 'Error al cerrar el turno de caja', error: error.message });
    }
  };
}
