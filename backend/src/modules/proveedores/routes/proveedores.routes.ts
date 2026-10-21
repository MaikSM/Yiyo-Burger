import { Router } from 'express';
import { ProveedoresController } from '../controllers/proveedores.controller';

export class ProveedoresRoutes {
  public readonly router: Router;
  private readonly controller: ProveedoresController;

  constructor() {
    this.router = Router();
    this.controller = new ProveedoresController();
    this.initializeRoutes();
  }

  public initializeRoutes(): void {
    const {
      getAll,
      getById,
      create,
      update,
      delete: deleteProv,
      getAllOrdenes,
      createOrden,
      registrarRecepcion,
      getFacturas,
      pagarFactura,
      getFluctuacionInsumo
    } = this.controller;

    // Proveedores CRUD
    this.router.get('/', getAll.bind(this.controller));
    this.router.get('/:id(\\d+)', getById.bind(this.controller));
    this.router.post('/', create.bind(this.controller));
    this.router.put('/:id(\\d+)', update.bind(this.controller));
    this.router.delete('/:id(\\d+)', deleteProv.bind(this.controller));

    // Ordenes de compra
    this.router.get('/ordenes', getAllOrdenes.bind(this.controller));
    this.router.post('/ordenes', createOrden.bind(this.controller));
    this.router.post('/ordenes/recepcion', registrarRecepcion.bind(this.controller));

    // Facturas y pagos
    this.router.get('/facturas', getFacturas.bind(this.controller));
    this.router.post('/facturas/:id/pagar', pagarFactura.bind(this.controller));

    // Analítica
    this.router.get('/insumos/:id/fluctuacion', getFluctuacionInsumo.bind(this.controller));
  }
}
