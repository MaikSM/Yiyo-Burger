import { Router } from 'express';
import { Repository } from 'typeorm';
import { MesaEntity } from '../entities/mesa.entity';
import { CreateMesaDto } from '../dtos/create-mesa.dto';
import { UpdateMesaDto } from '../dtos/update-mesa.dto';
import { MesasController } from '../controllers/mesas.controller';
import { MesasService } from '../services/mesas.service';
import { MesaRepository } from '../repositories/mesa.repository';
import { DatabaseConnection } from '../../../core/database/DatabaseConnection';

export class MesasRoutes {
  public router: Router;
  private mesasController: MesasController;

  constructor() {
    this.router = Router();
    const mesaRepository =
      DatabaseConnection.appDataSource.getRepository(MesaEntity);
    const iMesaRepository = new MesaRepository(mesaRepository);
    const mesasService = new MesasService(iMesaRepository);
    this.mesasController = new MesasController(mesasService);
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // GET /api/v1/mesas - Obtener todas las mesas (solo autenticados)
    this.router.get('/', async (req, res) => {
      try {
        const mesas = await this.mesasController.findAll();
        res.json(mesas);
      } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener las mesas' });
      }
    });

    // GET /api/v1/mesas/:id - Obtener una mesa por ID
    this.router.get('/:id', async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const mesa = await this.mesasController.findById(id);
        res.json(mesa);
      } catch (error: any) {
        if (error.message.includes('no encontrada')) {
          res.status(404).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Error al obtener la mesa' });
        }
      }
    });

    // POST /api/v1/mesas - Crear una nueva mesa
    this.router.post('/', async (req, res) => {
      try {
        const createMesaDto: CreateMesaDto = req.body;
        const mesa = await this.mesasController.create(createMesaDto);
        res.status(201).json(mesa);
      } catch (error: any) {
        if (error.message && error.message.includes('Ya existe')) {
          res.status(400).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Error al crear la mesa' });
        }
      }
    });

    // PATCH /api/v1/mesas/:id - Actualizar una mesa
    this.router.patch('/:id', async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const updateMesaDto: UpdateMesaDto = req.body;
        const mesa = await this.mesasController.update(id, updateMesaDto);
        res.json(mesa);
      } catch (error: any) {
        if (error.message.includes('no encontrada')) {
          res.status(404).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Error al actualizar la mesa' });
        }
      }
    });

    // DELETE /api/v1/mesas/:id - Eliminar una mesa
    this.router.delete('/:id', async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        await this.mesasController.delete(id);
        res.status(200).json({ message: 'Mesa eliminada correctamente' });
      } catch (error: any) {
        const msg = error.message || 'Error al eliminar la mesa';
        if (msg.includes('no encontrada')) {
          res.status(404).json({ error: msg });
        } else if (msg.includes('No se puede eliminar')) {
          res.status(400).json({ error: msg });
        } else {
          res.status(500).json({ error: msg });
        }
      }
    });

    // PATCH /api/v1/mesas/:id/estado - Cambiar el estado de una mesa
    this.router.patch('/:id/estado', async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const { estado } = req.body;
        const mesa = await this.mesasController.cambiarEstado(id, estado);
        res.json(mesa);
      } catch (error: any) {
        if (error.message.includes('no encontrada')) {
          res.status(404).json({ error: error.message });
        } else {
          res
            .status(500)
            .json({ error: 'Error al cambiar el estado de la mesa' });
        }
      }
    });

    // GET /api/v1/mesas/estado/:estado - Obtener mesas por estado
    this.router.get('/estado/:estado', async (req, res) => {
      try {
        const { estado } = req.params;
        const validEstados = ['libre', 'reservada', 'ocupada', 'mantenimiento'];
        if (!validEstados.includes(estado)) {
          return res.status(400).json({ error: 'Estado inválido' });
        }
        const mesas = await this.mesasController.findByEstado(
          estado as 'libre' | 'reservada' | 'ocupada' | 'mantenimiento',
        );
        res.json(mesas);
      } catch (error: any) {
        res
          .status(500)
          .json({ error: 'Error al obtener las mesas por estado' });
      }
    });

    // POST /api/v1/mesas/confirmar-pedido
    this.router.post('/confirmar-pedido', async (req, res) => {
      try {
        const { pedidoInfo, items } = req.body;
        if (!pedidoInfo || !items || !Array.isArray(items)) {
          return res.status(400).json({ error: 'Faltan datos de pedidoInfo o items' });
        }
        const result = await this.mesasController.confirmarPedido(pedidoInfo, items);
        res.status(200).json(result);
      } catch (error: any) {
        console.error('Error al confirmar pedido:', error);
        res.status(500).json({ error: 'Error al confirmar pedido e imprimir ticket' });
      }
    });

    // POST /api/v1/mesas/imprimir-factura
    this.router.post('/imprimir-factura', async (req, res) => {
      try {
        const { pedidoInfo, tipo } = req.body;
        if (!pedidoInfo) {
          return res.status(400).json({ error: 'Faltan datos de pedidoInfo' });
        }
        const result = await this.mesasController.imprimirFactura(pedidoInfo, tipo);
        res.status(200).json(result);
      } catch (error: any) {
        console.error('Error al imprimir factura:', error);
        res.status(500).json({ error: 'Error al imprimir factura' });
      }
    });

    // POST /api/v1/mesas/imprimir-precuenta
    this.router.post('/imprimir-precuenta', async (req, res) => {
      try {
        const { pedidoInfo, tipo } = req.body;
        if (!pedidoInfo) {
          return res.status(400).json({ error: 'Faltan datos de pedidoInfo' });
        }
        const result = await this.mesasController.imprimirPrecuenta(pedidoInfo, tipo);
        res.status(200).json(result);
      } catch (error: any) {
        console.error('Error al imprimir pre-cuenta:', error);
        res.status(500).json({ error: 'Error al imprimir pre-cuenta de mesa' });
      }
    });

    // POST /api/v1/mesas/confirmar-domicilio
    this.router.post('/confirmar-domicilio', async (req, res) => {
      try {
        const { pedidoInfo, items } = req.body;
        if (!pedidoInfo || !items || !Array.isArray(items)) {
          return res.status(400).json({ error: 'Faltan datos de pedidoInfo o items' });
        }
        const result = await this.mesasController.confirmarDomicilio(pedidoInfo, items);
        res.status(200).json(result);
      } catch (error: any) {
        console.error('Error al confirmar domicilio:', error);
        res.status(500).json({ error: 'Error al confirmar domicilio e imprimir ticket' });
      }
    });

    // POST /api/v1/mesas/abrir-caja
    this.router.post('/abrir-caja', async (req, res) => {
      try {
        const result = await this.mesasController.abrirCaja();
        res.status(200).json(result);
      } catch (error: any) {
        console.error('Error al abrir caja:', error);
        res.status(500).json({ error: 'Error al abrir caja' });
      }
    });
  }

  getRouter(): Router {
    return this.router;
  }
}
