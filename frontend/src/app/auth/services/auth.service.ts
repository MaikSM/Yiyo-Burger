import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { iLoginRequest, iRegisterRequest, iUser } from '@auth/interfaces';
import { environment } from '@env/environment';
import { catchError, finalize, map, Observable, of, shareReplay } from 'rxjs';

//
const RESOLVED_API_URL = environment.apiUrl;

const AUTH_API_URL = `${RESOLVED_API_URL}/auth`;
type AuthStatus = 'checking' | 'authenticated' | 'not-authenticated';
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _http: HttpClient = inject(HttpClient);

  private _authStatus = signal<AuthStatus>('checking');
  private _user = signal<iUser | null>(null);
  private _token = signal<string | null>(localStorage.getItem('token'));



  logPrivateProperties() {
    console.log({
      authStatus: this.authStatus(),
      user: this.user(),
      token: this.token(),
    });
  }

  public authStatus = computed<AuthStatus>(() => {
    if (this._authStatus() === 'checking') return 'checking';
    if (this._user()) return 'authenticated';
    return 'not-authenticated';
  });

  public user = computed<iUser | null>(() => this._user());
  public token = computed<string | null>(() => this._token());

  login(data: iLoginRequest): Observable<boolean> {
    console.log('🔐 AuthService Login - Datos recibidos:', {
      email: data.email,
      password: data.password,
      emailLength: data.email?.length,
      passwordLength: data.password?.length,
      apiUrl: `${AUTH_API_URL}/login`,
    });

    return this._http.post<iUser>(`${AUTH_API_URL}/login`, data).pipe(
      map((res) => {
        console.log('✅ AuthService Login - Respuesta exitosa:', {
          id: res.id,
          email: res.email,
          role: res.role,
          hasToken: !!res.token,
          tokenLength: res.token?.length,
        });
        return this.handleAuthSuccess(res);
      }),
      catchError((error: unknown) => {
        const httpError = (error ?? {}) as {
          status?: number;
          statusText?: string;
          message?: string;
          url?: string;
          error?: unknown;
        };
        console.error('❌ AuthService Login - Error:', {
          status: httpError.status,
          statusText: httpError.statusText,
          message: httpError.message,
          url: httpError.url,
          data: httpError.error,
        });
        return this.handleAuthError(error);
      }),
    );
  }

  register(data: iRegisterRequest): Observable<boolean> {
    return this._http
      .post<iUser>(`${AUTH_API_URL}/register`, data)

      .pipe(
        map((res) => this.handleAuthSuccess(res)),

        catchError((error: unknown) => this.handleAuthError(error)),
      );
  }

  updateProfile(data: iUser): Observable<boolean> {
    return this._http
      .post<iUser>(`${AUTH_API_URL}/update-profile`, data)

      .pipe(
        map((res) => this.handleAuthSuccess(res)),

        catchError((error: unknown) => this.handleAuthError(error)),
      );
  }

  // Cache for in-flight checkAuthStatus to prevent concurrent duplicate requests
  private _checkAuthStatusCache$: Observable<boolean> | null = null;

  checkAuthStatus(): Observable<boolean> {
    const token: string | null = localStorage.getItem('token');

    if (!token) {
      this._authStatus.set('not-authenticated');
      return of(false);
    }

    // If already authenticated with a user loaded, skip the HTTP call
    if (this._authStatus() === 'authenticated' && this._user()) {
      return of(true);
    }

    // If there's already an in-flight request, reuse it
    if (this._checkAuthStatusCache$) {
      return this._checkAuthStatusCache$;
    }

    // Fire one request and share it across all concurrent callers
    this._checkAuthStatusCache$ = this._http
      .post<iUser>(
        `${AUTH_API_URL}/check-token`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      .pipe(
        map((res) => this.handleAuthSuccess(res)),
        catchError((error: unknown) => this.handleAuthError(error)),
        finalize(() => {
          // Clear the cache once the request finishes so the next call is fresh
          this._checkAuthStatusCache$ = null;
        }),
        shareReplay(1),
      );

    return this._checkAuthStatusCache$;
  }

  logout() {
    this._user.set(null);
    this._token.set(null);
    this._authStatus.set('not-authenticated');
    localStorage.removeItem('token');
  }

  // Solicitar recuperación de contraseña
  requestPasswordRecovery(email: string): Observable<{ success: boolean; message: string }> {
    return this._http
      .post<{ message: string }>(`${AUTH_API_URL}/request-password-recovery`, { email })
      .pipe(
        map((res) => ({
          success: true,
          message: res.message,
        })),
        catchError((error: unknown) => {
          const httpError = error as { error?: { message?: string } };
          return of({
            success: false,
            message: httpError.error?.message || 'Error al solicitar recuperación de contraseña',
          });
        }),
      );
  }

  // Restablecer contraseña con token
  resetPassword(token: string, password: string): Observable<{ success: boolean; message: string }> {
    return this._http
      .post<{ message: string }>(`${AUTH_API_URL}/reset-password`, { token, password })
      .pipe(
        map((res) => ({
          success: true,
          message: res.message,
        })),
        catchError((error: unknown) => {
          const httpError = error as { error?: { message?: string } };
          return of({
            success: false,
            message: httpError.error?.message || 'Error al restablecer contraseña',
          });
        }),
      );
  }

  private handleAuthSuccess(res: iUser) {
    // Normalizar role_id desde role.id si no viene presente en la respuesta
    const normalizedUser: iUser = {
      ...res,
      role_id: Number(res.role_id ?? res.role?.id) || undefined,
    };

    this._user.set(normalizedUser);
    this._authStatus.set('authenticated');

    // Persistencia del token: sólo actualizar si la respuesta incluye un nuevo token
    if (res.token) {
      this._token.set(res.token);
      localStorage.setItem('token', res.token);
    }

    return true;
  }

  private handleAuthError(error: unknown) {
    console.error('AuthService Error:', error);
    this.logout();
    return of(false);
  }
}
