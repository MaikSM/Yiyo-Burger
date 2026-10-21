import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { toast } from 'ngx-sonner';
import { iLoginRequest } from '@auth/interfaces';
import { AuthService } from '@auth/services/auth.service';
import {
  SystemSecurityService,
  iSystemSecurityStatus,
  iSystemUnlockResponse,
} from '@auth/services/system-security.service';
import { environment } from '@env/environment';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'auth-login-page',
  imports: [ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './auth-login-page.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLoginPageComponent implements OnInit {
  private _router: Router = inject(Router);
  private _authService: AuthService = inject(AuthService);
  private _formBuilder: FormBuilder = inject(FormBuilder);
  private _activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  public systemSecurityService = inject(SystemSecurityService);

  hasError = signal<boolean>(false);
  isPosting = signal<boolean>(false);
  isUnlocking = signal<boolean>(false);
  unlockPassword = signal<string>('');

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

  ngOnInit(): void {
    this.isPosting.set(false);
    this.loginForm.reset();
    this.loginForm.enable();

    // Consultar el estado del bloqueo de seguridad mensual del sistema
    this.systemSecurityService.checkStatus().subscribe({
      next: (status: iSystemSecurityStatus) => {
        this.isPosting.set(false);
        this.loginForm.enable();
        if (status?.isLocked) {
          console.warn('🔒 Sistema bloqueado por política de seguridad mensual.');
        }
      },
      error: (_err: any) => {
        // Asegurar que el formulario esté listo e interactivo
        this.isPosting.set(false);
        this.loginForm.enable();
      },
    });
  }

  onUnlockSystem(): void {
    const password = this.unlockPassword().trim();
    if (!password) {
      toast.error('Campo Requerido', {
        duration: 3000,
        description: 'Por favor ingrese la contraseña de seguridad para desbloquear.',
      });
      return;
    }

    this.isUnlocking.set(true);
    this.systemSecurityService.unlock(password).subscribe({
      next: (res: iSystemUnlockResponse) => {
        this.isUnlocking.set(false);
        if (res.success) {
          toast.success('Sistema Desbloqueado', {
            duration: 3000,
            description: 'El sistema ha sido activado correctamente para el ciclo actual.',
          });
          this.unlockPassword.set('');
        } else {
          toast.error('Contraseña Incorrecta', {
            duration: 3000,
            description: res.message || 'La contraseña de seguridad ingresada es inválida.',
          });
        }
      },
      error: (err: any) => {
        this.isUnlocking.set(false);
        toast.error('Error de Conexión', {
          duration: 3000,
          description: err.error?.message || 'No se pudo validar la contraseña con el servidor.',
        });
      },
    });
  }

  onSubmit(): void {
    try {
      if (this.systemSecurityService.isSystemLocked()) {
        toast.error('Sistema Bloqueado', {
          duration: 3000,
          description: 'Debes desbloquear el sistema con la contraseña de seguridad antes de iniciar sesión.',
        });
        return;
      }

      console.log('🚀 Iniciando proceso de login...');

      if (this.loginForm.invalid) {
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

      this.isPosting.set(true);

      this._authService.login(data).subscribe({
        next: (isAuthenticated: boolean) => {
          if (isAuthenticated) {
            toast.success('Inicio de Sesión Exitoso', {
              duration: 2000,
              description: 'Bienvenido de Nuevo',
            });

            const returnUrl = this._activatedRoute.snapshot.queryParams['returnUrl'];
            if (returnUrl) {
              this._router.navigateByUrl(returnUrl);
              return;
            }

            const user = this._authService.user();
            const roleName = (user?.role?.name || '').toLowerCase();
            const isWaiter = user?.role_id === 3 || user?.role_id === 4 || roleName.includes('mesero') || roleName.includes('camarero');
            const redirectUrl = isWaiter ? '/waiter/mesas' : '/admin';
            this._router.navigateByUrl(redirectUrl);
            return;
          }

          toast.error('Inicio de Sesión Fallido', {
            duration: 2000,
            description: 'Credenciales Incorrectas',
          });

          this.isPosting.set(false);
        },
        error: (error: any) => {
          console.error('💥 Error en login:', error);
          if (error.status === 423) {
            this.systemSecurityService.isSystemLocked.set(true);
            toast.error('Sistema Bloqueado', {
              duration: 4000,
              description: error.error?.message || 'El sistema requiere la contraseña de seguridad mensual.',
            });
          } else {
            toast.error('Error de Conexión', {
              duration: 4000,
              description: `Error ${error.status || 'desconocido'}: ${error.message || 'No se pudo conectar con el servidor'}`,
            });
          }

          this.isPosting.set(false);
        },
      });
    } catch (error: any) {
      console.error('💥 Error inesperado:', error);
      toast.error('Error Inesperado', {
        duration: 3000,
        description: 'Ha ocurrido un error inesperado.',
      });
    }
  }
}
export default AuthLoginPageComponent;
