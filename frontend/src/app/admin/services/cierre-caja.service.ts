import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface CierreResumenResponse {
  abierto: boolean;
  data: any;
}

@Injectable({
  providedIn: 'root',
})
export class CierreCajaService {
  private _http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/caja`;

  getTurnoAbierto(): Observable<CierreResumenResponse> {
    return this._http.get<CierreResumenResponse>(`${this.apiUrl}/turno-abierto`);
  }

  getHistorial(): Observable<any[]> {
    return this._http.get<any[]>(`${this.apiUrl}/historial`);
  }

  abrirCaja(usuarioId?: number, usuarioNombre?: string, montoInicial: number = 0): Observable<any> {
    return this._http.post<any>(`${this.apiUrl}/abrir`, {
      usuario_id: usuarioId,
      usuario_nombre: usuarioNombre,
      monto_inicial: montoInicial,
    });
  }

  cerrarCaja(cierreId: number | string, montoRealContado: number, notas?: string): Observable<any> {
    return this._http.post<any>(`${this.apiUrl}/${cierreId}/cerrar`, {
      monto_real_contado: montoRealContado,
      notas,
    });
  }
}
