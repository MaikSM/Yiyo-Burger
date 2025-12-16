import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface Mesa {
  mesa_id: number;
  numero: number;
  capacidad: number;
  estado: 'libre' | 'reservada' | 'ocupada' | 'mantenimiento';
  created_at: string;
}

export interface CreateMesa {
  numero: number;
  capacidad: number;
  estado?: 'libre' | 'reservada' | 'ocupada' | 'mantenimiento';
}

export interface UpdateMesa extends Partial<CreateMesa> {}

@Injectable({
  providedIn: 'root'
})
export class MesasService {
  private _http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/mesas`;

  getAll(): Observable<Mesa[]> {
    return this._http.get<Mesa[]>(this.apiUrl);
  }

  getById(id: number): Observable<Mesa> {
    return this._http.get<Mesa>(`${this.apiUrl}/${id}`);
  }

  create(mesa: CreateMesa): Observable<Mesa> {
    return this._http.post<Mesa>(this.apiUrl, mesa);
  }

  update(id: number, mesa: UpdateMesa): Observable<Mesa> {
    return this._http.patch<Mesa>(`${this.apiUrl}/${id}`, mesa);
  }

  delete(id: number): Observable<void> {
    return this._http.delete<void>(`${this.apiUrl}/${id}`);
  }

  cambiarEstado(id: number, estado: Mesa['estado']): Observable<Mesa> {
    return this._http.patch<Mesa>(`${this.apiUrl}/${id}/estado`, { estado });
  }

  getByEstado(estado: Mesa['estado']): Observable<Mesa[]> {
    return this._http.get<Mesa[]>(`${this.apiUrl}/estado/${estado}`);
  }
}