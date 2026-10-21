import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface BarrioTarifa {
  id: number | string;
  nombre: string;
  precio: number;
}

@Injectable({
  providedIn: 'root',
})
export class BarriosService {
  private _http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/barrios`;

  getAll(): Observable<BarrioTarifa[]> {
    return this._http.get<BarrioTarifa[]>(this.apiUrl);
  }

  getById(id: number): Observable<BarrioTarifa> {
    return this._http.get<BarrioTarifa>(`${this.apiUrl}/${id}`);
  }

  create(barrio: { nombre: string; precio: number }): Observable<BarrioTarifa> {
    return this._http.post<BarrioTarifa>(this.apiUrl, barrio);
  }

  update(id: number | string, barrio: { nombre?: string; precio?: number }): Observable<BarrioTarifa> {
    return this._http.patch<BarrioTarifa>(`${this.apiUrl}/${id}`, barrio);
  }

  delete(id: number | string): Observable<any> {
    return this._http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
