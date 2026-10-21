import { Request, Response } from 'express';
import { ProveedoresService } from '../services/proveedores.service';

export class ProveedoresController {
  private service: ProveedoresService;

  constructor() {
    this.service = new ProveedoresService();
  }

  // --- PROVEEDORES CRUD ---
  public getAll = async (_req: Request, res: Response): Promise<Response> => {
    try {
      const data = await this.service.getAllProveedores();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({
        message: 'Error fetching proveedores | ProveedoresController',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  public getById = async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = parseInt(req.params.id);
      const data = await this.service.getProveedorById(id);
      if (!data) return res.status(404).json('Supplier not found');
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({
        message: 'Error fetching supplier | ProveedoresController',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  public create = async (req: Request, res: Response): Promise<Response> => {
    try {
      const data = await this.service.createProveedor(req.body);
      return res.status(201).json(data);
    } catch (error) {
      return res.status(400).json({
        message: 'Error creating supplier | ProveedoresController',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  public update = async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = parseInt(req.params.id);
      const data = await this.service.updateProveedor(id, req.body);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(400).json({
        message: 'Error updating supplier | ProveedoresController',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  public delete = async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = parseInt(req.params.id);
      await this.service.deleteProveedor(id);
      return res.status(200).json('Supplier deleted successfully');
    } catch (error) {
      return res.status(500).json({
        message: 'Error deleting supplier | ProveedoresController',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  // --- ORDENES COMPRA ---
  public getAllOrdenes = async (_req: Request, res: Response): Promise<Response> => {
    try {
      const data = await this.service.getAllOrdenesCompra();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({
        message: 'Error fetching purchase orders | ProveedoresController',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  public createOrden = async (req: Request, res: Response): Promise<Response> => {
    try {
      const data = await this.service.createOrdenCompra(req.body);
      return res.status(201).json(data);
    } catch (error) {
      return res.status(400).json({
        message: 'Error creating purchase order | ProveedoresController',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  public registrarRecepcion = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { ordenId, receivedItems, numFactura, fechaEmision, diasPlazo, fotoFactura, impuestoTasa, impuestoPct } = req.body;
      const tasa = impuestoTasa !== undefined ? parseFloat(impuestoTasa) : (impuestoPct !== undefined ? parseFloat(impuestoPct) : undefined);

      const payload = await this.service.registrarRecepcionPedido(
        parseInt(ordenId),
        receivedItems,
        numFactura,
        fechaEmision,
        diasPlazo !== undefined ? parseInt(diasPlazo) : undefined,
        1,
        'Admin System',
        fotoFactura,
        tasa
      );

      return res.status(200).json({
        message: 'Recepcion registrada, stock actualizado y factura generada con exito',
        ...payload
      });
    } catch (error) {
      return res.status(400).json({
        message: 'Error registering delivery receipt | ProveedoresController',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  // --- FACTURAS ---
  public getFacturas = async (_req: Request, res: Response): Promise<Response> => {
    try {
      const data = await this.service.getFacturas();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({
        message: 'Error fetching supplier invoices | ProveedoresController',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  public pagarFactura = async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = parseInt(req.params.id);
      const { monto, metodo_pago } = req.body;

      const data = await this.service.aplicarPagoFactura(id, parseFloat(monto), metodo_pago);
      return res.status(200).json({
        message: 'Pago aplicado exitosamente',
        factura: data
      });
    } catch (error) {
      return res.status(400).json({
        message: 'Error registering invoice payment | ProveedoresController',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  // --- ANALITICA ---
  public getFluctuacionInsumo = async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = parseInt(req.params.id);
      const data = await this.service.calcularFluctuacionInsumo(id);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({
        message: 'Error calculating price fluctuation | ProveedoresController',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
}
