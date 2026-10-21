import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Categoria {
  categoria_id: number;
  nombre: string;
  descripcion?: string;
  tipo?: 'menu' | 'inventario';
  seccion?: 'Parrilla' | 'Pizzas' | 'Bebidas';
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
  private _cache: Record<string, {message: string, data: Categoria[]}> = {};

  constructor(private http: HttpClient) { }

  reload$ = new BehaviorSubject<void>(undefined);

  clearCache() {
    this._cache = {};
  }

  getAll(tipo?: 'menu' | 'inventario', forceRefresh: boolean = false): Observable<{message: string, data: Categoria[]}> {
    const key = tipo || 'all';
    if (!forceRefresh && this._cache[key]) {
      return of(this._cache[key]);
    }
    const params = tipo ? { params: { tipo } } : {};
    return this.http.get<{message: string, data: Categoria[]}>(this.apiUrl, params).pipe(
      tap(res => this._cache[key] = res)
    );
  }

  getById(id: number): Observable<Categoria> {
    return this.http.get<Categoria>(`${this.apiUrl}/${id}`);
  }

  create(categoria: Omit<Categoria, 'categoria_id' | 'created_at' | 'updated_at' | 'deleted_at'>): Observable<Categoria> {
    this.clearCache();
    return this.http.post<Categoria>(this.apiUrl, categoria).pipe(
      tap(() => this.reload$.next())
    );
  }

  update(id: number, categoria: Partial<Categoria>): Observable<Categoria> {
    this.clearCache();
    return this.http.put<Categoria>(`${this.apiUrl}/${id}`, categoria).pipe(
      tap(() => this.reload$.next())
    );
  }

  delete(id: number): Observable<void> {
    this.clearCache();
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.reload$.next())
    );
  }

  findByNombre(nombre: string): Observable<Categoria | null> {
    return this.http.get<Categoria | null>(`${this.apiUrl}/find-by-nombre/${encodeURIComponent(nombre)}`);
  }
}