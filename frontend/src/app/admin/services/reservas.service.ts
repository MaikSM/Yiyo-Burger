import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  Mesa,
  Reserva,
  CreateMesa,
  UpdateMesa,
  CreateReserva,
  UpdateReserva,
} from '@shared/interfaces';
import { environment } from '@env/environment';
import { catchError, map, Observable, Subject, tap } from 'rxjs';

const API_URL_MESAS = `${environment.apiUrl}/mesas`;
const API_URL_RESERVAS = `${environment.apiUrl}/reservas`;

@Injectable({
  providedIn: 'root',
})
export class ReservasService {
  private _http: HttpClient = inject(HttpClient);
  private reloadSubject = new Subject<void>();
  public reload$ = this.reloadSubject.asObservable();

  notifyReload() {
    this.reloadSubject.next();
  }

  // Métodos para Mesas
  getMesas(): Observable<Mesa[]> {
    return this._http
      .get<any[]>(`${API_URL_MESAS}`, {
        headers: { 'Cache-Control': 'no-cache' },
      })
      .pipe(
        map((response) => {
          console.log('📋 Servicio: Datos de mesas del backend:', response);
          console.log('🔍 Primera mesa:', response[0]);

          // Mapear la respuesta del backend a la interfaz Mesa
          const mesasMapeadas = response.map((mesa: any) => ({
            id: mesa.mesa_id,
            numero: mesa.numero,
            capacidad: mesa.capacidad,
            estado: mesa.estado,
            ubicacion: mesa.ubicacion,
            created_at: mesa.created_at,
            updated_at: mesa.updated_at,
            deleted_at: mesa.deleted_at,
          }));

          console.log('✅ Servicio: Mesas mapeadas:', mesasMapeadas);
          return mesasMapeadas;
        }),
        catchError((error) => {
          console.error('❌ Servicio: Error al obtener mesas:', error);
          throw error;
        }),
      );
  }

  getMesaById(id: number): Observable<Mesa> {
    return this._http.get<{ success: boolean; message: string; data: Mesa }>(`${API_URL_MESAS}/${id}`).pipe(
      map((response) => {
        if (!response.data) {
          throw new Error('No se recibieron datos de la mesa');
        }
        return response.data;
      }),
    );
  }

  createMesa(mesa: CreateMesa): Observable<Mesa> {
    return this._http.post<{ success: boolean; message: string; data: Mesa }>(`${API_URL_MESAS}`, mesa).pipe(
      map((response) => {
        if (!response.data) {
          throw new Error('No se recibieron datos de la mesa creada');
        }
        return response.data;
      }),
      tap(() => this.notifyReload()),
      catchError((error) => {
        console.error('Error creating mesa:', error);
        throw error;
      }),
    );
  }

  updateMesa(id: number, mesa: UpdateMesa): Observable<Mesa> {
    return this._http.patch<{ success: boolean; message: string; data: Mesa }>(`${API_URL_MESAS}/${id}`, mesa).pipe(
      map((response) => {
        if (!response.data) {
          throw new Error('No se recibieron datos de la mesa actualizada');
        }
        return response.data;
      }),
      tap(() => this.notifyReload()),
      catchError((error) => {
        console.error('Error updating mesa:', error);
        throw error;
      }),
    );
  }

  deleteMesa(id: number): Observable<Mesa[]> {
    return this._http
      .delete<Mesa[]>(`${API_URL_MESAS}/${id}`)
      .pipe(tap(() => this.notifyReload()));
  }

  cambiarEstadoMesa(
    id: number,
    estado: 'libre' | 'reservada' | 'ocupada' | 'mantenimiento',
  ): Observable<Mesa> {
    return this._http
      .patch<Mesa>(`${API_URL_MESAS}/${id}/estado`, { estado })
      .pipe(
        tap((data) => {
          return data;
        }),
        tap(() => this.notifyReload()),
        catchError((error) => {
          console.error('Error changing mesa status:', error);
          throw error;
        }),
      );
  }

  // Métodos para Reservas
  getReservas(): Observable<Reserva[]> {
    console.log('🔄 Servicio: Solicitando reservas desde', API_URL_RESERVAS);
    return this._http
      .get<any>(`${API_URL_RESERVAS}`, {
        headers: { 'Cache-Control': 'no-cache' },
      })
      .pipe(
        tap((response) => {
          console.log('✅ Servicio: Respuesta del backend:', response);
        }),
        map((response) => {
          // Extraer el array de reservas de la respuesta
          let reservasArray: any[] = [];

          if (Array.isArray(response)) {
            reservasArray = response;
            console.log(
              '✅ Servicio: La respuesta es un array con',
              reservasArray.length,
              'reservas',
            );
          } else if (response && typeof response === 'object') {
            // Si es un objeto, intentar extraer el array de la propiedad 'data'
            reservasArray = response.data || response.reservas || [];
            console.log(
              '✅ Servicio: La respuesta es un objeto, extrayendo array de data:',
              reservasArray.length,
              'reservas',
            );
          } else {
            console.warn('⚠️ Servicio: Respuesta inesperada:', response);
            reservasArray = [];
          }

          console.log('📋 Servicio: Datos de reservas:', reservasArray);
          console.log('🔍 Primera reserva:', reservasArray[0]);

          // Mapear la respuesta del backend a la interfaz Reserva
          const reservasMapeadas = reservasArray.map((reserva: any) => ({
            reserva_id: reserva.reserva_id,
            mesa_id: reserva.mesa_id,
            cliente_nombre: reserva.cliente_nombre,
            cliente_email: reserva.cliente_email,
            cliente_telefono: reserva.cliente_telefono,
            fecha_hora: new Date(reserva.fecha_hora),
            numero_personas: reserva.numero_personas,
            estado: reserva.estado,
            notas: reserva.notas,
            created_at: new Date(reserva.created_at),
            updated_at: new Date(reserva.updated_at),
            deleted_at: reserva.deleted_at
              ? new Date(reserva.deleted_at)
              : undefined,
            mesa: reserva.mesa
              ? {
                  id: reserva.mesa.mesa_id,
                  numero: reserva.mesa.numero,
                  capacidad: reserva.mesa.capacidad,
                  estado: reserva.mesa.estado,
                  ubicacion: reserva.mesa.ubicacion,
                  created_at: reserva.mesa.created_at,
                  updated_at: reserva.mesa.updated_at,
                  deleted_at: reserva.mesa.deleted_at,
                }
              : undefined,
          }));

          console.log('✅ Servicio: Reservas mapeadas:', reservasMapeadas);
          return reservasMapeadas;
        }),
        catchError((error) => {
          console.error('❌ Servicio: Error al obtener reservas:', error);
          throw error;
        }),
      );
  }

  // Obtener las reservas del usuario logueado
  getMisReservas(): Observable<Reserva[]> {
    console.log('🔄 Servicio: Solicitando mis reservas desde', `${API_URL_RESERVAS}/mis-reservas`);
    return this._http
      .get<any>(`${API_URL_RESERVAS}/mis-reservas`, {
        headers: { 'Cache-Control': 'no-cache' },
      })
      .pipe(
        tap((response) => {
          console.log('✅ Servicio: Respuesta del backend (mis reservas):', response);
        }),
        map((response) => {
          // Extraer el array de reservas de la respuesta
          let reservasArray: any[] = [];

          if (Array.isArray(response)) {
            reservasArray = response;
          } else if (response && typeof response === 'object') {
            reservasArray = response.data || response.reservas || [];
          } else {
            console.warn('⚠️ Servicio: Respuesta inesperada:', response);
            reservasArray = [];
          }

          // Mapear la respuesta del backend a la interfaz Reserva
          const reservasMapeadas = reservasArray.map((reserva: any) => ({
            reserva_id: reserva.reserva_id,
            mesa_id: reserva.mesa_id,
            cliente_nombre: reserva.cliente_nombre,
            cliente_email: reserva.cliente_email,
            cliente_telefono: reserva.cliente_telefono,
            fecha_hora: new Date(reserva.fecha_hora),
            numero_personas: reserva.numero_personas,
            estado: reserva.estado,
            notas: reserva.notas,
            created_at: new Date(reserva.created_at),
            updated_at: new Date(reserva.updated_at),
            deleted_at: reserva.deleted_at
              ? new Date(reserva.deleted_at)
              : undefined,
            mesa: reserva.mesa
              ? {
                  id: reserva.mesa.mesa_id,
                  numero: reserva.mesa.numero,
                  capacidad: reserva.mesa.capacidad,
                  estado: reserva.mesa.estado,
                  ubicacion: reserva.mesa.ubicacion,
                  created_at: reserva.mesa.created_at,
                  updated_at: reserva.mesa.updated_at,
                  deleted_at: reserva.mesa.deleted_at,
                }
              : undefined,
          }));

          console.log('✅ Servicio: Mis reservas mapeadas:', reservasMapeadas);
          return reservasMapeadas;
        }),
        catchError((error) => {
          console.error('❌ Servicio: Error al obtener mis reservas:', error);
          throw error;
        }),
      );
  }

  getReservaById(id: number): Observable<Reserva> {
    console.log('🔄 Servicio: Solicitando reserva ID:', id);
    return this._http.get<{ success: boolean; message: string; data: Reserva }>(`${API_URL_RESERVAS}/${id}`).pipe(
      tap((response) => {
        console.log('📥 Servicio: Respuesta completa:', response);
        if (response.data) {
          console.log('📥 Servicio: Reserva recibida:', response.data);
          console.log(
            '🔢 Servicio: mesa_id:',
            response.data.mesa_id,
            typeof response.data.mesa_id,
          );
        }
      }),
      map((response) => {
        if (!response.data) {
          throw new Error('No se recibieron datos de la reserva');
        }
        return response.data;
      }),
      catchError((error) => {
        console.error('❌ Servicio: Error al obtener reserva:', error);
        throw error;
      }),
    );
  }

  getReservasByFecha(fecha: string): Observable<Reserva[]> {
    return this._http.get<{ success: boolean; message: string; data: Reserva[] }>(`${API_URL_RESERVAS}/fecha/${fecha}`).pipe(
      map((response) => {
        if (!response.data) {
          return [];
        }
        return response.data;
      }),
    );
  }

  getReservasByMesa(mesaId: number): Observable<Reserva[]> {
    return this._http.get<{ success: boolean; message: string; data: Reserva[] }>(`${API_URL_RESERVAS}/mesa/${mesaId}`).pipe(
      map((response) => {
        if (!response.data) {
          return [];
        }
        return response.data;
      }),
    );
  }

  createReserva(reserva: CreateReserva): Observable<Reserva> {
    return this._http.post<{ success: boolean; message: string; data: Reserva }>(API_URL_RESERVAS, reserva).pipe(
      map((response) => {
        if (!response.data) {
          throw new Error('No se recibieron datos de la reserva creada');
        }
        return response.data;
      }),
      tap(() => this.notifyReload()),
      catchError((error) => {
        console.error('Error creating reserva:', error);
        throw error;
      }),
    );
  }

  updateReserva(id: number, reserva: UpdateReserva): Observable<Reserva> {
    return this._http.put<{ success: boolean; message: string; data: Reserva }>(`${API_URL_RESERVAS}/${id}`, reserva).pipe(
      map((response) => {
        if (!response.data) {
          throw new Error('No se recibieron datos de la reserva actualizada');
        }
        return response.data;
      }),
      tap(() => this.notifyReload()),
      catchError((error) => {
        console.error('Error updating reserva:', error);
        throw error;
      }),
    );
  }

  deleteReserva(id: number): Observable<Reserva[]> {
    return this._http
      .delete<{ success: boolean; message: string; data: Reserva[] }>(`${API_URL_RESERVAS}/${id}`)
      .pipe(
        map((response) => {
          if (!response.data) {
            return [];
          }
          return response.data;
        }),
        tap(() => this.notifyReload()),
      );
  }

  cancelarReserva(id: number): Observable<Reserva> {
    return this._http
      .patch<{ success: boolean; message: string; data: Reserva }>(`${API_URL_RESERVAS}/${id}/cancelar`, {})
      .pipe(
        map((response) => {
          if (!response.data) {
            throw new Error('No se recibieron datos de la reserva cancelada');
          }
          return response.data;
        }),
        tap(() => this.notifyReload()),
        catchError((error) => {
          console.error('Error canceling reserva:', error);
          throw error;
        }),
      );
  }

  getEstadisticas(): Observable<any> {
    return this._http.get<{ success: boolean; message: string; data: any }>(`${API_URL_RESERVAS}/estadisticas`).pipe(
      map((response) => {
        if (!response.data) {
          throw new Error('No se recibieron datos de estadísticas');
        }
        return response.data;
      }),
      catchError((error) => {
        console.error('Error fetching estadisticas:', error);
        throw error;
      }),
    );
  }
}
