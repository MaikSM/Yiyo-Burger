import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface Asistencia {
  id: number;
  user_id: number;
  fecha: string;
  hora_entrada?: string | null;
  hora_salida?: string | null;
  estado: string;
  created_at: Date;
  updated_at: Date;
  user?: {
    id: number;
    name: string;
    surname: string;
    email: string;
    role?: {
      id: number;
      name: string;
      description: string;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class AsistenciaService {
  private apiUrl = `${environment.apiUrl}/asistencia`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Asistencia[]> {
    return this.http.get<Asistencia[]>(this.apiUrl);
  }

  getById(id: number): Observable<Asistencia> {
    return this.http.get<Asistencia>(`${this.apiUrl}/${id}`);
  }

  getByUserAndDate(userId: number, fecha: string): Observable<Asistencia> {
    return this.http.get<Asistencia>(`${this.apiUrl}/user/${userId}/date/${fecha}`);
  }

  getByUserAndMonth(userId: number, year: number, month: number): Observable<Asistencia[]> {
    return this.http.get<Asistencia[]>(`${this.apiUrl}/user/${userId}/month/${year}/${month}`);
  }

  getMonthlyStats(userId: number, year: number, month: number): Observable<{
    totalDias: number;
    presentes: number;
    ausentes: number;
    retrasos: number;
    salidasTempranas: number;
  }> {
    return this.http.get<{
      totalDias: number;
      presentes: number;
      ausentes: number;
      retrasos: number;
      salidasTempranas: number;
    }>(`${this.apiUrl}/stats/user/${userId}/month/${year}/${month}`);
  }

  create(asistencia: Omit<Asistencia, 'id' | 'created_at' | 'updated_at'>): Observable<Asistencia> {
    return this.http.post<Asistencia>(this.apiUrl, asistencia);
  }

  update(id: number, asistencia: Partial<Asistencia>): Observable<Asistencia> {
    return this.http.patch<Asistencia>(`${this.apiUrl}/${id}`, asistencia);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}