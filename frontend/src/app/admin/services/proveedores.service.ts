import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface Proveedor {
  id?: number;
  razon_social: string;
  nit: string;
  contacto?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  categoria?: string;
  datos_bancarios_banco?: string;
  datos_bancarios_tipo?: string;
  datos_bancarios_numero?: string;
  dias_plazo?: number;
  activo?: boolean;
  saldo_pendiente?: number;
}

export interface OrdenCompra {
  id?: number;
  proveedor_id: number;
  fecha_pedido?: string;
  fecha_entrega_estimada?: string;
  estado?: 'Borrador' | 'Solicitado' | 'Recibido' | 'Cancelado';
  total_estimado?: number;
  foto_factura?: string;
  items: Array<{
    ingrediente_id: number;
    nombre: string;
    cantidad_compra: number;
    unidad_compra: string;
    costo_compra: number;
    factor_conversion: number;
    unidad_stock: string;
  }>;
}

export interface FacturaProveedor {
  id?: number;
  proveedor_id: number;
  proveedor_nombre?: string;
  num_factura: string;
  orden_compra_id?: number;
  fecha_emision: string;
  fecha_vencimiento: string;
  subtotal: number;
  impuestos: number;
  total: number;
  saldo_pendiente: number;
  estado_pago: 'Pagado' | 'Pendiente' | 'Vencido';
  plazo_dias?: number;
  foto_factura?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProveedoresService {
  private _http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/proveedores`;

  // --- CRUD PROVEEDORES ---
  getAll(): Observable<Proveedor[]> {
    return this._http.get<Proveedor[]>(this.apiUrl);
  }

  getById(id: number): Observable<Proveedor> {
    return this._http.get<Proveedor>(`${this.apiUrl}/${id}`);
  }

  create(data: Proveedor): Observable<Proveedor> {
    return this._http.post<Proveedor>(this.apiUrl, data);
  }

  update(id: number, data: Partial<Proveedor>): Observable<Proveedor> {
    return this._http.put<Proveedor>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<any> {
    return this._http.delete<any>(`${this.apiUrl}/${id}`);
  }

  // --- ORDENES COMPRA ---
  getAllOrdenes(): Observable<OrdenCompra[]> {
    return this._http.get<OrdenCompra[]>(`${this.apiUrl}/ordenes`);
  }

  createOrden(data: OrdenCompra): Observable<OrdenCompra> {
    return this._http.post<OrdenCompra>(`${this.apiUrl}/ordenes`, data);
  }

  registrarRecepcion(data: {
    ordenId: number;
    numFactura: string;
    fechaEmision: string;
    diasPlazo?: number;
    fotoFactura?: string;
    impuestoTasa?: number;
    receivedItems: Array<{
      ingrediente_id: number;
      cantidad_recibida: number;
      merma: number;
      costo_real: number;
    }>;
  }): Observable<any> {
    return this._http.post<any>(`${this.apiUrl}/ordenes/recepcion`, data);
  }

  // --- FACTURAS Y PAGOS ---
  getFacturas(): Observable<FacturaProveedor[]> {
    return this._http.get<FacturaProveedor[]>(`${this.apiUrl}/facturas`);
  }

  pagarFactura(id: number, data: { monto: number; metodo_pago: 'Efectivo' | 'Transferencia' | 'Caja Menor' }): Observable<any> {
    return this._http.post<any>(`${this.apiUrl}/facturas/${id}/pagar`, data);
  }

  // --- ANALITICA ---
  getFluctuacionInsumo(id: number): Observable<{
    fluctuacionPorcentaje: number;
    costoAnterior: number;
    costoUltimo: number;
    mensaje: string;
  }> {
    return this._http.get<any>(`${this.apiUrl}/insumos/${id}/fluctuacion`);
  }
}
