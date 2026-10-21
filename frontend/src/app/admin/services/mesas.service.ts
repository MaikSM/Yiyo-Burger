import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '@env/environment';

export interface Mesa {
  mesa_id: number;
  numero: number;
  capacidad: number;
  estado: 'libre' | 'reservada' | 'ocupada' | 'mantenimiento';
  ubicacion?: string;
  created_at: string;
}

export interface CreateMesa {
  numero: number;
  capacidad: number;
  estado?: 'libre' | 'reservada' | 'ocupada' | 'mantenimiento';
  ubicacion?: string;
}

export interface UpdateMesa extends Partial<CreateMesa> {}

@Injectable({
  providedIn: 'root'
})
export class MesasService {
  private _http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/mesas`;
  private _cachedMesas: Mesa[] | null = null;

  clearCache() {
    this._cachedMesas = null;
  }

  getAll(forceRefresh: boolean = false): Observable<Mesa[]> {
    if (!forceRefresh && this._cachedMesas) {
      return of(this._cachedMesas);
    }
    return this._http.get<Mesa[]>(this.apiUrl).pipe(
      tap(mesas => this._cachedMesas = mesas)
    );
  }

  getById(id: number): Observable<Mesa> {
    return this._http.get<Mesa>(`${this.apiUrl}/${id}`);
  }

  create(mesa: CreateMesa): Observable<Mesa> {
    this.clearCache();
    return this._http.post<Mesa>(this.apiUrl, mesa);
  }

  update(id: number, mesa: UpdateMesa): Observable<Mesa> {
    this.clearCache();
    return this._http.patch<Mesa>(`${this.apiUrl}/${id}`, mesa);
  }

  delete(id: number): Observable<void> {
    this.clearCache();
    return this._http.delete<void>(`${this.apiUrl}/${id}`);
  }

  cambiarEstado(id: number, estado: Mesa['estado']): Observable<Mesa> {
    if (this._cachedMesas) {
      const target = this._cachedMesas.find(m => m.mesa_id === id);
      if (target) target.estado = estado;
    }
    return this._http.patch<Mesa>(`${this.apiUrl}/${id}/estado`, { estado });
  }

  getByEstado(estado: Mesa['estado']): Observable<Mesa[]> {
    return this._http.get<Mesa[]>(`${this.apiUrl}/estado/${estado}`);
  }

  confirmarPedido(pedidoInfo: any, items: any[]): Observable<any> {
    return this._http.post<any>(`${this.apiUrl}/confirmar-pedido`, { pedidoInfo, items });
  }

  confirmarDomicilio(pedidoInfo: any, items: any[]): Observable<any> {
    return this._http.post<any>(`${this.apiUrl}/confirmar-domicilio`, { pedidoInfo, items });
  }

  abrirCaja(): Observable<any> {
    return this._http.post<any>(`${this.apiUrl}/abrir-caja`, {});
  }

  imprimirFactura(pedidoInfo: any, tipo?: string): Observable<any> {
    return this._http.post<any>(`${this.apiUrl}/imprimir-factura`, { pedidoInfo, tipo });
  }

  imprimirPrecuenta(pedidoInfo: any, tipo?: string): Observable<any> {
    return this._http.post<any>(`${this.apiUrl}/imprimir-precuenta`, { pedidoInfo, tipo });
  }
}