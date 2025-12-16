import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { toast } from 'ngx-sonner';
import { iLoginRequest } from '@auth/interfaces';
import { AuthService } from '@auth/services/auth.service';
import { environment } from '@env/environment';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'auth-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './auth-login-page.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLoginPageComponent {
  private _router: Router = inject(Router);
  private _authService: AuthService = inject(AuthService);
  private _formBuilder: FormBuilder = inject(FormBuilder);
  private _activatedRoute: ActivatedRoute = inject(ActivatedRoute);

  hasError = signal<boolean>(false);
  isPosting = signal<boolean>(false);

  loginForm: FormGroup = this._formBuilder.group({
    email: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
      ],
    ],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  onSubmit(): void {
    try {
      console.log('🚀 Iniciando proceso de login...');
      console.log(
        '📱 User Agent:',
        typeof window !== 'undefined' && window.navigator
          ? window.navigator.userAgent
          : 'Unknown',
      );
      console.log('🌐 URL actual:', window.location.href);

      if (this.loginForm.invalid) {
        console.log('❌ Formulario inválido:', this.loginForm.errors);
        toast.error('Inicio de Sesión Fallido', {
          duration: 2000,
          description: 'Por Favor, Completa Todos los Campos Requeridos',
        });
        return;
      }

      const data: iLoginRequest = {
        email: this.loginForm.controls['email'].value,
        password: this.loginForm.controls['password'].value,
      };

      console.log('📤 Datos a enviar:', { email: data.email, password: '***' });
      console.log('🔗 API URL:', `${environment.apiUrl}/auth/login`);

      this.isPosting.set(true);

      this._authService.login(data).subscribe({
        next: (isAuthenticated) => {
          console.log('✅ Respuesta del servicio de auth:', isAuthenticated);
          if (isAuthenticated) {
            toast.success('Inicio de Sesión Exitoso', {
              duration: 2000,
              description: 'Bienvenido de Nuevo',
            });

            // Verificar si hay un returnUrl en los query params
            const returnUrl = this._activatedRoute.snapshot.queryParams['returnUrl'];

            if (returnUrl) {
              console.log('🔀 Redirigiendo al returnUrl:', returnUrl);
              this._router.navigateByUrl(returnUrl);
              return;
            }

            // Redirigir según el rol del usuario
            const userRoleId = this._authService.user()?.role_id;
            let redirectUrl = '/';
            if (userRoleId === 4) {
              redirectUrl = '/waiter';
            } else if (userRoleId === 1) {
              redirectUrl = '/admin';
            } else {
              redirectUrl = '/private/reservas';
            }
            console.log('🔀 Redirigiendo a:', redirectUrl);
            this._router.navigateByUrl(redirectUrl);
            return;
          }

          console.log('❌ Login fallido - credenciales incorrectas');
          toast.error('Inicio de Sesión Fallido', {
            duration: 2000,
            description: 'Credenciales Incorrectas',
          });

          this.isPosting.set(false);
        },
        error: (error) => {
          console.error('💥 Error en login:', error);
          console.error('🔍 Detalles del error:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            url: error.url,
          });

          toast.error('Error de Conexión', {
            duration: 4000,
            description: `Error ${error.status || 'desconocido'}: ${error.message || 'No se pudo conectar con el servidor'}`,
          });

          this.isPosting.set(false);
        },
      });
    } catch (error) {
      console.error('💥 Error inesperado:', error);
      toast.error('Error Inesperado', {
        duration: 3000,
        description: 'Ha ocurrido un error inesperado. Revisa la consola.',
      });
    }
  }

}
export default AuthLoginPageComponent;
