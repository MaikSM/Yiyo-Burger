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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toast } from 'ngx-sonner';
import { AuthService } from '@auth/services/auth.service';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'auth-restablecer-contrasena-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './auth-restablecer-contrasena-page.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthRestablecerContrasenaPageComponent {
  private _authService: AuthService = inject(AuthService);
  private _formBuilder: FormBuilder = inject(FormBuilder);
  private _route: ActivatedRoute = inject(ActivatedRoute);
  private _router: Router = inject(Router);

  isPosting = signal<boolean>(false);
  passwordReset = signal<boolean>(false);
  tokenValid = signal<boolean>(true);

  resetForm: FormGroup = this._formBuilder.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  token: string | null = null;

  constructor() {
    // Obtener el token de los query params
    this._route.queryParams.subscribe((params) => {
      this.token = params['token'];
      if (!this.token) {
        this.tokenValid.set(false);
        toast.error('Token Inválido', {
          duration: 3000,
          description: 'No se proporcionó un token válido. Solicita un nuevo enlace de recuperación.',
        });
      }
    });
  }

  passwordsMatch(): boolean {
    const password = this.resetForm.controls['password'].value;
    const confirmPassword = this.resetForm.controls['confirmPassword'].value;
    return password === confirmPassword;
  }

  onSubmit(): void {
    if (this.resetForm.invalid) {
      toast.error('Formulario Inválido', {
        duration: 2000,
        description: 'Por favor, completa todos los campos correctamente',
      });
      return;
    }

    if (!this.passwordsMatch()) {
      toast.error('Las contraseñas no coinciden', {
        duration: 2000,
        description: 'Por favor, asegúrate de que ambas contraseñas sean iguales',
      });
      return;
    }

    if (!this.token) {
      toast.error('Token Inválido', {
        duration: 2000,
        description: 'No se proporcionó un token válido',
      });
      return;
    }

    const password = this.resetForm.controls['password'].value;
    this.isPosting.set(true);

    this._authService.resetPassword(this.token, password).subscribe({
      next: (response) => {
        this.isPosting.set(false);
        if (response.success) {
          this.passwordReset.set(true);
          toast.success('Contraseña Actualizada', {
            duration: 4000,
            description: response.message,
          });
          // Redirigir al login después de 3 segundos
          setTimeout(() => {
            this._router.navigate(['/auth/login']);
          }, 3000);
        } else {
          toast.error('Error', {
            duration: 3000,
            description: response.message,
          });
        }
      },
      error: (error) => {
        this.isPosting.set(false);
        console.error('Error inesperado:', error);
        toast.error('Error Inesperado', {
          duration: 3000,
          description: 'Ha ocurrido un error inesperado. Intenta nuevamente.',
        });
      },
    });
  }
}

export default AuthRestablecerContrasenaPageComponent;
