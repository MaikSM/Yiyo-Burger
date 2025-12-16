import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface Plato {
  plato_id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria?: string;
  imagen_url?: string;
  disponible: boolean;
  tiempo_preparacion_minutos?: number;
  alergenos?: string[];
  created_at: string;
}

export interface CreatePlato {
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria?: string;
  imagen_url?: string;
  disponible?: boolean;
  tiempo_preparacion_minutos?: number;
  alergenos?: string[];
}

export interface UpdatePlato extends Partial<CreatePlato> {}

export interface MenuEstadisticas {
  total_platos: number;
  platos_por_categoria: Record<string, number>;
  precio_promedio: number;
  categorias_disponibles: string[];
}

@Injectable({
  providedIn: 'root'
})
export class PlatosService {
  private _http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/platos`;

  getAll(): Observable<Plato[]> {
    return this._http.get<Plato[]>(`${environment.apiUrl}/platos-public`);
  }

  getById(id: number): Observable<Plato> {
    return this._http.get<Plato>(`${this.apiUrl}/${id}`);
  }

  create(plato: CreatePlato): Observable<Plato> {
    return this._http.post<Plato>(this.apiUrl, plato);
  }

  update(id: number, plato: UpdatePlato): Observable<Plato> {
    return this._http.patch<Plato>(`${this.apiUrl}/${id}`, plato);
  }

  delete(id: number): Observable<void> {
    return this._http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getEstadisticas(): Observable<MenuEstadisticas> {
    return this._http.get<MenuEstadisticas>(`${this.apiUrl}/estadisticas`);
  }

  search(query: string): Observable<Plato[]> {
    return this._http.get<Plato[]>(`${this.apiUrl}/search?q=${encodeURIComponent(query)}`);
  }

  uploadImage(imageFile: File): Observable<{ imageUrl: string; filename: string }> {
    const formData = new FormData();
    formData.append('imagen', imageFile);

    return this._http.post<{ imageUrl: string; filename: string }>(`${this.apiUrl}/upload-image`, formData);
  }
}