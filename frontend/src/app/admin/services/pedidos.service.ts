import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface OrderItem {
  id: string;
  nombre: string;
  precio: number;
  qty: number;
}

export interface Order {
  id: string | number;
  orderNumber?: number;
  domicilioNumber?: number;
  tipo: 'Mesa' | 'Domicilio' | 'Llevar' | 'Barra';
  fecha: string;
  estado: string;
  subtotal: number;
  impuesto_valor?: number;
  propina_valor?: number;
  total: number;
  metodo_pago?: string;
  monto_entregado?: number;
  vuelto?: number;
  items: OrderItem[];
  cliente_nombre?: string;
  cliente_telefono?: string;
  cliente_direccion?: string;
  cliente_barrio?: string;
  mesa?: string;
  ubicacion?: string;
  notas?: string;
  mesero?: string;
  usuario_id?: number;
  cierre_id?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PedidosService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/pedidos`;
  private _cachedActiveOrders: Order[] | null = null;

  clearActiveCache() {
    this._cachedActiveOrders = null;
  }

  getPedidos(): Observable<Order[]> {
    return this.getToday();
  }

  getToday(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}?today=true`);
  }

  getActive(forceRefresh: boolean = false): Observable<Order[]> {
    if (!forceRefresh && this._cachedActiveOrders) {
      return of(this._cachedActiveOrders);
    }
    return this.http.get<Order[]>(`${this.apiUrl}?active=true`).pipe(
      tap(orders => this._cachedActiveOrders = orders)
    );
  }

  getAll(
    options?: boolean | {
      all?: boolean;
      today?: boolean;
      active?: boolean;
      usuario_id?: number;
      mesero?: string;
      date?: string;
    }
  ): Observable<Order[]> {
    if (typeof options === 'boolean') {
      if (options) {
        return this.http.get<Order[]>(`${this.apiUrl}?all=true`);
      }
      return this.getToday();
    }

    if (options && typeof options === 'object') {
      const params: string[] = [];
      if (options.all) params.push('all=true');
      if (options.today) params.push('today=true');
      if (options.active) params.push('active=true');
      if (options.usuario_id) params.push(`usuario_id=${options.usuario_id}`);
      if (options.mesero) params.push(`mesero=${encodeURIComponent(options.mesero)}`);
      if (options.date) params.push(`date=${options.date}`);

      const queryString = params.length ? `?${params.join('&')}` : '?today=true';
      return this.http.get<Order[]>(`${this.apiUrl}${queryString}`);
    }

    return this.getToday();
  }

  createPedido(pedido: Partial<Order>): Observable<Order> {
    this.clearActiveCache();
    return this.http.post<Order>(this.apiUrl, pedido);
  }

  updatePedido(id: string | number, pedido: Partial<Order>): Observable<Order> {
    this.clearActiveCache();
    return this.http.put<Order>(`${this.apiUrl}/${id}`, pedido);
  }

  update(id: string | number, pedido: Partial<Order>): Observable<Order> {
    return this.updatePedido(id, pedido);
  }

  deletePedido(id: string | number): Observable<any> {
    this.clearActiveCache();
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getEventsStream(): Observable<any> {
    return new Observable<any>((observer) => {
      const eventSource = new EventSource(`${this.apiUrl}/events`);
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          observer.next(data);
        } catch (e) {
          console.error('Error parsing SSE event:', e);
        }
      };
      eventSource.onerror = (error) => {
        console.warn('SSE connection warning (will auto-reconnect):', error);
      };
      return () => {
        eventSource.close();
      };
    });
  }
}
