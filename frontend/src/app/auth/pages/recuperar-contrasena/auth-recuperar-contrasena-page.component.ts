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
import { RouterLink } from '@angular/router';
import { toast } from 'ngx-sonner';
import { AuthService } from '@auth/services/auth.service';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'auth-recuperar-contrasena-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './auth-recuperar-contrasena-page.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthRecuperarContrasenaPageComponent {
  private _authService: AuthService = inject(AuthService);
  private _formBuilder: FormBuilder = inject(FormBuilder);

  isPosting = signal<boolean>(false);
  emailSent = signal<boolean>(false);

  recoveryForm: FormGroup = this._formBuilder.group({
    email: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
      ],
    ],
  });

  onSubmit(): void {
    if (this.recoveryForm.invalid) {
      toast.error('Formulario Inválido', {
        duration: 2000,
        description: 'Por favor, ingresa un correo electrónico válido',
      });
      return;
    }

    const email = this.recoveryForm.controls['email'].value;
    this.isPosting.set(true);

    this._authService.requestPasswordRecovery(email).subscribe({
      next: (response) => {
        this.isPosting.set(false);
        if (response.success) {
          this.emailSent.set(true);
          toast.success('Correo Enviado', {
            duration: 4000,
            description: response.message,
          });
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

export default AuthRecuperarContrasenaPageComponent;
