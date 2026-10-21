import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable, tap } from 'rxjs';

export interface iSystemSecurityStatus {
  isLocked: boolean;
  currentCycle: string;
  lockDay: number;
  message: string;
}

export interface iSystemUnlockResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class SystemSecurityService {
  private _http = inject(HttpClient);
  private _apiUrl = `${environment.apiUrl}/system-security`;

  public isSystemLocked = signal<boolean>(false);
  public lockMessage = signal<string>('');

  checkStatus(): Observable<iSystemSecurityStatus> {
    return this._http.get<iSystemSecurityStatus>(`${this._apiUrl}/status`).pipe(
      tap((status) => {
        this.isSystemLocked.set(status.isLocked);
        this.lockMessage.set(status.message);
      })
    );
  }

  unlock(password: string): Observable<iSystemUnlockResponse> {
    return this._http.post<iSystemUnlockResponse>(`${this._apiUrl}/unlock`, { password }).pipe(
      tap((res) => {
        if (res.success) {
          this.isSystemLocked.set(false);
          this.lockMessage.set('');
        }
      })
    );
  }
}
