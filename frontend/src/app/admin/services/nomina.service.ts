import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface PagoNomina {
  id: string;
  user_id: number;
  empleado_nombre: string;
  fecha: string; // YYYY-MM-DD
  dias_pagados: number;
  monto: number;
  metodo_pago: string;
  observaciones?: string;
  registrado_como_gasto?: boolean;
  created_at: string;
}

export interface AsistenciaDia {
  fecha: string; // YYYY-MM-DD
  presentes: {
    user_id: number;
    nombre: string;
    hora_entrada?: string;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class NominaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/nomina`;

  getPagos(): Observable<PagoNomina[]> {
    return this.http.get<PagoNomina[]>(`${this.apiUrl}/pagos`);
  }

  savePago(pagoData: Omit<PagoNomina, 'id' | 'created_at'>, registrarComoEgreso: boolean = true): Observable<PagoNomina> {
    return this.http.post<PagoNomina>(`${this.apiUrl}/pagos`, {
      pagoData,
      registrarComoEgreso
    });
  }

  deletePago(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/pagos/${id}`);
  }

  getAsistenciasMap(): Observable<Record<string, { user_id: number; nombre: string; hora_entrada?: string }[]>> {
    return this.http.get<Record<string, { user_id: number; nombre: string; hora_entrada?: string }[]>>(`${this.apiUrl}/asistencias`);
  }

  saveAsistenciasDia(fecha: string, empleadosPresentes: { user_id: number; nombre: string; hora_entrada?: string }[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/asistencias`, {
      fecha,
      empleadosPresentes
    });
  }
}
