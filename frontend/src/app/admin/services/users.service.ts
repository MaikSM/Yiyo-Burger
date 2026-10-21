import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { iUser } from '@auth/interfaces';
import { environment } from '@env/environment';
import { catchError, Observable, of, tap } from 'rxjs';

const API_URL = `${environment.apiUrl}/users`;

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private _http: HttpClient = inject(HttpClient);
  private _cachedUsers: iUser[] | null = null;
  public forbidenUsers = computed<number[]>(() => [1, 2, 3]);

  clearCache() {
    this._cachedUsers = null;
  }

  getAll(forceRefresh: boolean = false): Observable<iUser[]> {
    if (!forceRefresh && this._cachedUsers) {
      return of(this._cachedUsers);
    }
    return this._http.get<iUser[]>(API_URL).pipe(
      tap(users => this._cachedUsers = users)
    );
  }

  getById(id: number): Observable<iUser> {
    return this._http.get<iUser>(`${API_URL}/${id}`);
  }

  create(user: iUser): Observable<iUser> {
    return this._http.post<iUser>(API_URL, user).pipe(
      tap(() => this.clearCache()),
      catchError((error) => {
        console.error('Error creating user:', error);
        throw error;
      }),
    );
  }

  updateById(id: number, user: iUser): Observable<iUser> {
    return this._http.patch<iUser>(`${API_URL}/${id}`, user).pipe(
      tap(() => this.clearCache()),
      catchError((error) => {
        console.error('Error updating user:', error);
        throw error;
      }),
    );
  }

  deleteById(id: number): Observable<iUser[]> {
    return this._http.delete<iUser[]>(`${API_URL}/${id}`).pipe(
      tap(() => this.clearCache())
    );
  }

  toggleStatus(id: number, is_active: boolean): Observable<any> {
    return this._http.patch<any>(`${API_URL}/${id}/toggle-status`, { is_active }).pipe(
      tap(() => this.clearCache())
    );
  }
}
