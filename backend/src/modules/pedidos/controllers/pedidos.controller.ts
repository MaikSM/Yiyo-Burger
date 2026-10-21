import { Request, Response } from 'express';
import { PedidosService } from '../services/pedidos.service';
import { realTimeEmitter } from '../../../core/events/realtime.events';

export class PedidosController {
  private pedidosService = new PedidosService();

  public events(req: Request, res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const onEvent = (eventData: any) => {
      try {
        res.write(`data: ${JSON.stringify(eventData)}\n\n`);
      } catch (err) {
        console.error('Error enviando evento SSE:', err);
      }
    };

    realTimeEmitter.on('realtime', onEvent);

    // Initial connection ping
    res.write(`data: ${JSON.stringify({ type: 'connected', time: new Date().toISOString() })}\n\n`);

    // Heartbeat every 20s to keep connection alive across proxies/routers
    const heartbeat = setInterval(() => {
      try {
        res.write(':keepalive\n\n');
      } catch (err) {
        clearInterval(heartbeat);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(heartbeat);
      realTimeEmitter.off('realtime', onEvent);
    });
  }

  public async getAll(req: Request, res: Response): Promise<void> {
    try {
      const activeOnly = req.query.active === 'true';
      const todayOnly = req.query.today === 'true';
      const all = req.query.all === 'true';
      const date = req.query.date ? String(req.query.date) : undefined;
      const mesero = req.query.mesero ? String(req.query.mesero) : undefined;
      const usuario_id = req.query.usuario_id ? Number(req.query.usuario_id) : undefined;

      const pedidos = await this.pedidosService.getAll({ activeOnly, todayOnly, date, all, mesero, usuario_id });
      res.status(200).json(pedidos);
    } catch (error: any) {
      res.status(500).json({ message: 'Error al obtener los pedidos', error: error.message });
    }
  }

  public async create(req: Request, res: Response): Promise<void> {
    try {
      const nuevoPedido = await this.pedidosService.create(req.body);
      res.status(201).json(nuevoPedido);
    } catch (error: any) {
      res.status(500).json({ message: 'Error al crear el pedido', error: error.message });
    }
  }

  public async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updated = await this.pedidosService.update(id, req.body);
      if (!updated) {
        res.status(404).json({ message: 'Pedido no encontrado' });
        return;
      }
      res.status(200).json(updated);
    } catch (error: any) {
      res.status(500).json({ message: 'Error al actualizar el pedido', error: error.message });
    }
  }

  public async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.pedidosService.delete(id);
      if (!deleted) {
        res.status(404).json({ message: 'Pedido no encontrado' });
        return;
      }
      res.status(200).json({ message: 'Pedido eliminado correctamente' });
    } catch (error: any) {
      res.status(500).json({ message: 'Error al eliminar el pedido', error: error.message });
    }
  }
}
