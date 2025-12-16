import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Categoria {
  categoria_id: number;
  nombre: string;
  descripcion?: string;
  tipo?: 'menu' | 'inventario';
  activo: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CategoriasService {
  private apiUrl = `${environment.apiUrl}/categorias`;

  constructor(private http: HttpClient) { }

  reload$ = new BehaviorSubject<void>(undefined);

  getAll(tipo?: 'menu' | 'inventario'): Observable<{message: string, data: Categoria[]}> {
    const params = tipo ? { params: { tipo } } : {};
    return this.http.get<{message: string, data: Categoria[]}>(this.apiUrl, params);
  }

  getById(id: number): Observable<Categoria> {
    return this.http.get<Categoria>(`${this.apiUrl}/${id}`);
  }

  create(categoria: Omit<Categoria, 'categoria_id' | 'created_at' | 'updated_at' | 'deleted_at'>): Observable<Categoria> {
    return this.http.post<Categoria>(this.apiUrl, categoria).pipe(
      tap(() => this.reload$.next())
    );
  }

  update(id: number, categoria: Partial<Categoria>): Observable<Categoria> {
    return this.http.put<Categoria>(`${this.apiUrl}/${id}`, categoria).pipe(
      tap(() => this.reload$.next())
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.reload$.next())
    );
  }

  findByNombre(nombre: string): Observable<Categoria | null> {
    return this.http.get<Categoria | null>(`${this.apiUrl}/find-by-nombre/${encodeURIComponent(nombre)}`);
  }
}