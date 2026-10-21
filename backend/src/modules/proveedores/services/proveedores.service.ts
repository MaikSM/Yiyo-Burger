import { Repository, DataSource, LessThan, MoreThan } from 'typeorm';
import { ProveedorEntity } from '../entities/proveedor.entity';
import { OrdenCompraEntity } from '../entities/orden-compra.entity';
import { FacturaProveedorEntity } from '../entities/factura-proveedor.entity';
import { HistorialPagoEntity } from '../entities/historial-pago.entity';
import { IngredienteEntity } from '../../inventario/entities/ingrediente.entity';
import { InventarioEntity } from '../../inventario/entities/inventario.entity';
import { DatabaseConnection } from '../../../core/database/DatabaseConnection';

export class ProveedoresService {
  private readonly proveedorRepo: Repository<ProveedorEntity>;
  private readonly ordenCompraRepo: Repository<OrdenCompraEntity>;
  private readonly facturaRepo: Repository<FacturaProveedorEntity>;
  private readonly pagoRepo: Repository<HistorialPagoEntity>;
  private readonly ingredienteRepo: Repository<IngredienteEntity>;
  private readonly inventarioRepo: Repository<InventarioEntity>;

  constructor() {
    const ds = DatabaseConnection.appDataSource;
    this.proveedorRepo = ds.getRepository(ProveedorEntity);
    this.ordenCompraRepo = ds.getRepository(OrdenCompraEntity);
    this.facturaRepo = ds.getRepository(FacturaProveedorEntity);
    this.pagoRepo = ds.getRepository(HistorialPagoEntity);
    this.ingredienteRepo = ds.getRepository(IngredienteEntity);
    this.inventarioRepo = ds.getRepository(InventarioEntity);
  }

  // --- PROVEEDORES CRUD ---
  async createProveedor(data: Partial<ProveedorEntity>): Promise<ProveedorEntity> {
    if (!data.nit) {
      throw new Error('El NIT/ID Fiscal es obligatorio');
    }
    const dup = await this.proveedorRepo.findOne({ where: { nit: data.nit } });
    if (dup) {
      throw new Error(`Ya existe un proveedor registrado con el NIT: ${data.nit}`);
    }
    const prov = this.proveedorRepo.create(data);
    return await this.proveedorRepo.save(prov);
  }

  async getAllProveedores(): Promise<any[]> {
    const provees = await this.proveedorRepo.find({ order: { razon_social: 'ASC' } });
    const res: any[] = [];
    for (const p of provees) {
      // Calcular saldo pendiente
      const facts = await this.facturaRepo.find({
        where: { proveedor_id: p.id, estado_pago: 'Pendiente' }
      });
      const queryVencidas = await this.facturaRepo.find({
        where: { proveedor_id: p.id, estado_pago: 'Vencido' }
      });
      const totalPendiente = [...facts, ...queryVencidas].reduce((sum, f) => sum + Number(f.saldo_pendiente), 0);
      res.push({
        ...p,
        saldo_pendiente: totalPendiente
      });
    }
    return res;
  }

  async getProveedorById(id: number): Promise<ProveedorEntity | null> {
    return await this.proveedorRepo.findOne({ where: { id } });
  }

  async updateProveedor(id: number, data: Partial<ProveedorEntity>): Promise<ProveedorEntity> {
    const prov = await this.proveedorRepo.findOne({ where: { id } });
    if (!prov) throw new Error('Proveedor no encontrado');

    if (data.nit && data.nit !== prov.nit) {
      const dup = await this.proveedorRepo.findOne({ where: { nit: data.nit } });
      if (dup) throw new Error(`Ya existe otro proveedor registrado con el NIT: ${data.nit}`);
    }

    Object.assign(prov, data);
    return await this.proveedorRepo.save(prov);
  }

  async deleteProveedor(id: number): Promise<void> {
    const prov = await this.proveedorRepo.findOne({ where: { id } });
    if (!prov) throw new Error('Proveedor no encontrado');
    await this.proveedorRepo.remove(prov);
  }

  // --- ORDENES COMPRA CRUD ---
  async createOrdenCompra(data: Partial<OrdenCompraEntity>): Promise<OrdenCompraEntity> {
    const oc = this.ordenCompraRepo.create({
      ...data,
      estado: 'Borrador',
      fecha_pedido: new Date()
    });
    return await this.ordenCompraRepo.save(oc);
  }

  async updateOrdenCompraStatus(id: number, estado: 'Borrador' | 'Solicitado' | 'Recibido' | 'Cancelado'): Promise<OrdenCompraEntity> {
    const oc = await this.ordenCompraRepo.findOne({ where: { id } });
    if (!oc) throw new Error('Orden de compra no encontrada');
    oc.estado = estado;
    return await this.ordenCompraRepo.save(oc);
  }

  async getAllOrdenesCompra(): Promise<OrdenCompraEntity[]> {
    return await this.ordenCompraRepo.find({ order: { created_at: 'DESC' } });
  }

  async getOrdenCompraById(id: number): Promise<OrdenCompraEntity | null> {
    return await this.ordenCompraRepo.findOne({ where: { id } });
  }

  // --- REGISTRAR RECEPCIÓN DE PEDIDO ---
  async registrarRecepcionPedido(
    ordenId: number,
    receivedItems: Array<{
      ingrediente_id: number;
      cantidad_recibida: number; // en empaque de compra
      merma: number;             // en empaque de compra (dañado/descarte)
      costo_real: number;        // costo real por empaque de compra pagado en factura
    }>,
    numFactura: string,
    fechaEmision: string,
    diasPlazoInput?: number,
    usuarioId: number = 1,
    usuarioNombre: string = 'Admin System',
    fotoFactura?: string,
    impuestoTasaInput?: number
  ): Promise<{ factura: FacturaProveedorEntity; orden: OrdenCompraEntity }> {
    return await DatabaseConnection.appDataSource.transaction(async (manager) => {
      // 1. Cargar orden de compra
      const oc = await manager.findOne(OrdenCompraEntity, { where: { id: ordenId } });
      if (!oc) throw new Error('Orden de compra no encontrada');
      if (oc.estado === 'Recibido') throw new Error('Esta orden de compra ya fue recibida');

      const proveedor = await manager.findOne(ProveedorEntity, { where: { id: oc.proveedor_id } });
      if (!proveedor) throw new Error('Proveedor no encontrado');

      const diasPlazo = diasPlazoInput !== undefined ? diasPlazoInput : proveedor.dias_plazo;

      let subtotalFactura = 0;

      // 2. Procesar cada item recibido
      for (const ri of receivedItems) {
        const riIngId = Number(ri.ingrediente_id);
        const riCant = Number(ri.cantidad_recibida) || 0;
        const riCosto = Number(ri.costo_real) || 0;
        const riMerma = Number(ri.merma) || 0;

        subtotalFactura += riCosto * riCant;

        const originalItem = (oc.items || []).find(i => Number(i.ingrediente_id) === riIngId);
        const factor = originalItem ? (Number(originalItem.factor_conversion) || 1) : 1;
        const totalRecibidoStock = riCant * factor;
        const totalMermaStock = riMerma * factor;
        const totalEntradoStock = Math.max(0, totalRecibidoStock - totalMermaStock);

        // Cargar ingrediente
        const ing = await manager.findOne(IngredienteEntity, { where: { ingrediente_id: riIngId } });
        if (ing) {
          // Actualizar stock
          const stockActualNum = Number(ing.stock_actual) || 0;
          ing.stock_actual = stockActualNum + totalEntradoStock;

          // Calcular nuevo costo unitario de stock
          if (riCosto > 0) {
            const nuevoCostoStockUnitario = factor > 0 ? (riCosto / factor) : riCosto;
            ing.costo_unitario = nuevoCostoStockUnitario;
          }

          await manager.save(IngredienteEntity, ing);

          // Registrar entrada en InventarioEntity
          if (totalEntradoStock > 0) {
            const mEntrada = manager.create(InventarioEntity, {
              ingrediente_id: ing.ingrediente_id,
              ingrediente_nombre: ing.nombre,
              usuario_id: usuarioId,
              usuario_nombre: usuarioNombre,
              cantidad: totalEntradoStock,
              tipo_movimiento: 'ENTRADA',
              fecha: new Date(),
              motivo: `Recepcion de Compra OC #${ordenId} - Factura #${numFactura}`,
              costo_total: riCosto * riCant
            });
            await manager.save(InventarioEntity, mEntrada);
          }

          // Registrar merma si existe
          if (totalMermaStock > 0) {
            const mMerma = manager.create(InventarioEntity, {
              ingrediente_id: ing.ingrediente_id,
              ingrediente_nombre: ing.nombre,
              usuario_id: usuarioId,
              usuario_nombre: usuarioNombre,
              cantidad: totalMermaStock,
              tipo_movimiento: 'SALIDA',
              fecha: new Date(),
              motivo: `Merma en Recepcion OC #${ordenId} - Factura #${numFactura}`,
              costo_total: 0
            });
            await manager.save(InventarioEntity, mMerma);
          }
        }
      }

      // 3. Calcular IVA (tasa variable, default 19%)
      let impuestoTasa = 0.19;
      if (impuestoTasaInput !== undefined && impuestoTasaInput !== null) {
        impuestoTasa = impuestoTasaInput > 1 ? impuestoTasaInput / 100 : impuestoTasaInput;
      }
      const impuestosFactura = subtotalFactura * impuestoTasa;
      const totalFactura = subtotalFactura + impuestosFactura;

      const emision = new Date(fechaEmision);
      const vencimiento = new Date(emision);
      vencimiento.setDate(vencimiento.getDate() + diasPlazo);

      // Validar si ya existe factura con ese número para este proveedor
      const dupFact = await manager.findOne(FacturaProveedorEntity, {
        where: { proveedor_id: oc.proveedor_id, num_factura: numFactura }
      });
      if (dupFact) {
        throw new Error(`La factura #${numFactura} ya está registrada para este proveedor`);
      }

      const factura = manager.create(FacturaProveedorEntity, {
        proveedor_id: oc.proveedor_id,
        num_factura: numFactura,
        orden_compra_id: ordenId,
        fecha_emision: emision,
        fecha_vencimiento: vencimiento,
        subtotal: subtotalFactura,
        impuestos: impuestosFactura,
        total: totalFactura,
        saldo_pendiente: totalFactura,
        estado_pago: 'Pendiente',
        foto_factura: fotoFactura || oc.foto_factura
      });

      const savedFactura = await manager.save(FacturaProveedorEntity, factura);

      // 4. Actualizar estado de la orden a Recibido
      oc.estado = 'Recibido';
      oc.total_estimado = subtotalFactura;
      if (fotoFactura) oc.foto_factura = fotoFactura;
      const savedOrden = await manager.save(OrdenCompraEntity, oc);

      return { factura: savedFactura, orden: savedOrden };
    });
  }

  // --- APLICAR PAGO A FACTURA ---
  async aplicarPagoFactura(
    facturaId: number,
    monto: number,
    metodo: 'Efectivo' | 'Transferencia' | 'Caja Menor'
  ): Promise<FacturaProveedorEntity> {
    const fact = await this.facturaRepo.findOne({ where: { id: facturaId } });
    if (!fact) throw new Error('Factura no encontrada');

    if (fact.estado_pago === 'Pagado' || fact.saldo_pendiente <= 0) {
      throw new Error('Esta factura ya está completamente pagada');
    }

    const saldoPrevio = Number(fact.saldo_pendiente);
    let nuevoSaldo = saldoPrevio - monto;
    if (nuevoSaldo < 0) nuevoSaldo = 0;

    fact.saldo_pendiente = nuevoSaldo;
    if (nuevoSaldo === 0) {
      fact.estado_pago = 'Pagado';
    }

    const savedFactura = await this.facturaRepo.save(fact);

    // Registrar en Historial_Pagos
    const pago = this.pagoRepo.create({
      factura_id: facturaId,
      fecha_pago: new Date(),
      monto_pagado: monto,
      metodo_pago: metodo
    });
    await this.pagoRepo.save(pago);

    return savedFactura;
  }

  async getFacturas(): Promise<any[]> {
    const list = await this.facturaRepo.find({ order: { fecha_vencimiento: 'ASC' } });
    const res: any[] = [];
    const provees = await this.proveedorRepo.find();
    
    const hoy = new Date();

    for (const f of list) {
      const p = provees.find(prov => prov.id === f.proveedor_id);
      
      // Auto-vencer si la fecha ya pasó y el saldo pendiente es mayor a 0
      if (f.estado_pago === 'Pendiente' && new Date(f.fecha_vencimiento) < hoy) {
        f.estado_pago = 'Vencido';
        await this.facturaRepo.save(f);
      }

      res.push({
        ...f,
        proveedor_nombre: p ? p.razon_social : 'Desconocido',
        plazo_dias: p ? p.dias_plazo : 0
      });
    }
    return res;
  }

  async getHistorialPagos(facturaId?: number): Promise<HistorialPagoEntity[]> {
    if (facturaId) {
      return await this.pagoRepo.find({ where: { factura_id: facturaId }, order: { fecha_pago: 'DESC' } });
    }
    return await this.pagoRepo.find({ order: { fecha_pago: 'DESC' } });
  }

  // --- ANALÍTICA DE PRECIOS (FLUCTUACIÓN) ---
  async calcularFluctuacionInsumo(ingredienteId: number): Promise<{
    fluctuacionPorcentaje: number;
    costoAnterior: number;
    costoUltimo: number;
    mensaje: string;
  }> {
    // Buscar movimientos de entrada de este ingrediente asociados a compras
    const entradas = await this.inventarioRepo.find({
      where: { ingrediente_id: ingredienteId, tipo_movimiento: 'ENTRADA' },
      order: { created_at: 'DESC' },
      take: 2
    });

    if (entradas.length < 2) {
      return {
        fluctuacionPorcentaje: 0,
        costoAnterior: 0,
        costoUltimo: entradas.length === 1 ? Number(entradas[0].costo_total) / Number(entradas[0].cantidad) : 0,
        mensaje: 'No hay suficientes recepciones previas para comparar la fluctuación.'
      };
    }

    const mUltimo = entradas[0];
    const mAnterior = entradas[1];

    const cUltimo = Number(mUltimo.costo_total) / Number(mUltimo.cantidad);
    const cAnterior = Number(mAnterior.costo_total) / Number(mAnterior.cantidad);

    if (cAnterior === 0) {
      return {
        fluctuacionPorcentaje: 0,
        costoAnterior: 0,
        costoUltimo: cUltimo,
        mensaje: 'El costo anterior registrado fue de 0.'
      };
    }

    const dif = cUltimo - cAnterior;
    const porc = (dif / cAnterior) * 100;

    let msg = `El costo unitario de stock cambió de $${cAnterior.toFixed(2)} a $${cUltimo.toFixed(2)}. `;
    if (porc > 0) {
      msg += `Subió un ${porc.toFixed(2)}% (Incremento de costos).`;
    } else if (porc < 0) {
      msg += `Bajó un ${Math.abs(porc).toFixed(2)}% (Ahorro obtenido).`;
    } else {
      msg += `Se mantuvo estable sin fluctuaciones.`;
    }

    return {
      fluctuacionPorcentaje: porc,
      costoAnterior: cAnterior,
      costoUltimo: cUltimo,
      mensaje: msg
    };
  }
}
