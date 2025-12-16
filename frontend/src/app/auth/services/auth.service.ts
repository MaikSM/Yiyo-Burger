import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { iLoginRequest, iRegisterRequest, iUser } from '@auth/interfaces';
import { environment } from '@env/environment';
import { catchError, map, Observable, of } from 'rxjs';

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

  checkStatusResource = rxResource({
    loader: () => this.checkAuthStatus(),
  });

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

  checkAuthStatus(): Observable<boolean> {
    const token: string | null = localStorage.getItem('token');

    if (!token) {
      this._authStatus.set('not-authenticated');
      return of(false);
    }
    // check-token
    return this._http
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
      );
  }

  logout() {
    this._user.set(null);
    this._token.set(null);
    this._authStatus.set('not-authenticated');
    localStorage.removeItem('token');
  }

  private handleAuthSuccess(res: iUser) {
    // Normalizar role_id desde role.id si no viene presente en la respuesta
    const normalizedUser: iUser = {
      ...res,
      role_id: (res.role_id ?? res.role?.id) as number | undefined,
    };

    this._user.set(normalizedUser);
    this._token.set(res.token ?? null);
    this._authStatus.set('authenticated');

    // Persistencia del token: guarda sólo si existe; si no, limpia
    if (res.token) {
      localStorage.setItem('token', res.token);
    } else {
      localStorage.removeItem('token');
    }

    return true;
  }

  private handleAuthError(error: unknown) {
    console.error('AuthService Error:', error);
    this.logout();
    return of(false);
  }
}
