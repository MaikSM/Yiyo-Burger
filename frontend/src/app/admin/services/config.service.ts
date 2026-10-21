import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PosConfig {
  printer_caja_ip: string;
  printer_pizzas_ip: string;
  printer_parrilla_ip: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/config`;

  getConfig(): Observable<PosConfig> {
    return this.http.get<PosConfig>(this.apiUrl);
  }

  updateConfig(config: PosConfig): Observable<{ message: string, data: PosConfig }> {
    return this.http.post<{ message: string, data: PosConfig }>(this.apiUrl, config);
  }

  testPrinter(tipo: 'Caja' | 'Parrilla' | 'Pizzas', ip?: string): Observable<{ success: boolean; message: string; ip: string }> {
    return this.http.post<{ success: boolean; message: string; ip: string }>(`${this.apiUrl}/test-printer`, { tipo, ip });
  }

  getSystemPrinters(): Observable<{ success: boolean; printers: string[] }> {
    return this.http.get<{ success: boolean; printers: string[] }>(`${this.apiUrl}/system-printers`);
  }

  exportDatabase(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export-db`, { responseType: 'blob' });
  }

  importDatabase(file: File): Observable<{ message: string; backup?: string }> {
    const formData = new FormData();
    formData.append('database', file);
    return this.http.post<{ message: string; backup?: string }>(`${this.apiUrl}/import-db`, formData);
  }

  getPrintQueueJobs(limit: number = 50): Observable<{
    jobs: any[];
    stats: {
      pendientes: number;
      imprimiendo: number;
      impresos_hoy: number;
      fallidos: number;
      total: number;
    };
  }> {
    return this.http.get<any>(`${environment.apiUrl}/impresion/jobs?limit=${limit}`);
  }

  retryPrintJob(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${environment.apiUrl}/impresion/retry/${id}`, {});
  }

  retryAllPrintJobs(): Observable<{ success: boolean; count: number; message: string }> {
    return this.http.post<{ success: boolean; count: number; message: string }>(`${environment.apiUrl}/impresion/retry-all`, {});
  }
}
