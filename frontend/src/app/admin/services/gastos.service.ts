import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Gasto {
  id?: string;
  cierre_id?: number;
  fecha: string;
  monto: number;
  metodo_pago: string;
  motivo: string;
  categoria: string;
  usuario_nombre?: string;
  created_at?: string;
}

@Injectable({
  providedIn: 'root',
})
export class GastosService {
  private _http = inject(HttpClient);
  private _apiUrl = `${environment.apiUrl}/gastos`;

  getAll(fecha?: string, cierreId?: number): Observable<Gasto[]> {
    let params: any = {};
    if (fecha) params.fecha = fecha;
    if (cierreId) params.cierre_id = cierreId;
    return this._http.get<Gasto[]>(this._apiUrl, { params });
  }

  create(gasto: Partial<Gasto>): Observable<Gasto> {
    return this._http.post<Gasto>(this._apiUrl, gasto);
  }

  delete(id: string): Observable<any> {
    return this._http.delete(`${this._apiUrl}/${id}`);
  }
}
