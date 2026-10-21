import { RolesService } from '@admin/services/roles.service';
import { UsersService } from '@admin/services/users.service';
import { CommonModule } from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  ResourceRef,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { iRole, iUser } from '@auth/interfaces';
import { toast } from 'ngx-sonner';
import { from } from 'rxjs';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'admin-users-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-users-form.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersFormComponent {
  constructor() {
    // Reactivamente aplicar patchValue cuando llegan los datos
    /*     effect(() => {
      if (!this.isCreateMode() && this.userData.hasValue()) {
        this.form.patchValue({
          name: this.userData.value()?.name!,
          surname: this.userData.value()?.surname!,
          email: this.userData.value()?.email!,
          password: this.userData.value()?.password!,
          role_id: this.userData.value()?.role_id!,
        });

      }
    }); */

    effect(() => {
      const user = this.userData.value();
      const roles = this.rolesResource.value();

      if (!this.isCreateMode() && user && roles) {
        // En modo edición, las contraseñas son opcionales (para cambiar solo cuando el usuario lo desee)
        this.form.get('password')?.clearValidators();
        this.form.get('password')?.updateValueAndValidity();
        this.form.get('confirmation')?.clearValidators();
        this.form.get('confirmation')?.updateValueAndValidity();

        this.form.patchValue({
          name: user.name,
          surname: user.surname,
          email: user.email,
          role_id: user.role?.id,
        });
      }
    });
  }
  public isSelected = signal<boolean>(false);
  private _usersService: UsersService = inject(UsersService);
  private _rolesService: RolesService = inject(RolesService);

  private _route: ActivatedRoute = inject(ActivatedRoute);
  private _router: Router = inject(Router);
  private _formBuilder: FormBuilder = inject(FormBuilder);
  /** Señal con la URL actual */
  private readonly currentUrl = signal(this._router.url);
  /** Computed para detectar si es creación */
  isCreateMode = computed<boolean>(() => this.currentUrl().endsWith('/create'));
  /** Computed para extraer el ID si es edición */
  userId = computed(() =>
    this.isCreateMode()
      ? null
      : Number(this._route.snapshot.paramMap.get('id')),
  );

  userData = rxResource({
    loader: () => {
      if (this.userId() === null) {
        return from(Promise.resolve(null)); // Wrap the Promise in an Observable
      }
      return this._usersService.getById(this.userId()!);
    },
  });

  rolesResource: ResourceRef<iRole[] | undefined> = rxResource({
    loader: () => this._rolesService.getAll(),
  });

  public form: FormGroup = this._formBuilder.group({
    name: this._formBuilder.control('', [
      Validators.required,
      Validators.minLength(2),
    ]),
    surname: this._formBuilder.control('', [
      Validators.required,
      Validators.minLength(2),
    ]),
    email: this._formBuilder.control('', [
      Validators.required,
      Validators.email,
    ]),
    password: this._formBuilder.control('', [
      Validators.required,
      Validators.minLength(8),
    ]),
    confirmation: this._formBuilder.control('', [
      Validators.required,
      Validators.minLength(8),
    ]),
    role_id: this._formBuilder.control(null, [
      Validators.required,
      Validators.min(1),
    ]),
  });

  onCleanForm() {
    this.form.reset();
  }

  onSubmit() {
    try {
      this.form.markAllAsTouched();

      if (this.form.invalid) {
        if (this.form.get('name')?.invalid) {
          toast.error('Nombre inválido', {
            description: 'El nombre es obligatorio y debe tener al menos 2 caracteres.',
            duration: 4000,
          });
          return;
        }
        if (this.form.get('surname')?.invalid) {
          toast.error('Apellido inválido', {
            description: 'El apellido es obligatorio y debe tener al menos 2 caracteres.',
            duration: 4000,
          });
          return;
        }
        if (this.form.get('email')?.invalid) {
          toast.error('Correo electrónico inválido', {
            description: 'Por favor ingrese un correo electrónico válido.',
            duration: 4000,
          });
          return;
        }
        if (this.form.get('password')?.invalid) {
          toast.error('Contraseña corta', {
            description: 'La contraseña es requerida y debe tener al menos 8 caracteres.',
            duration: 4000,
          });
          return;
        }
        if (this.form.get('confirmation')?.invalid) {
          toast.error('Confirmación corta', {
            description: 'La confirmación debe tener al menos 8 caracteres.',
            duration: 4000,
          });
          return;
        }
        if (this.form.get('role_id')?.invalid) {
          toast.error('Rol requerido', {
            description: 'Por favor seleccione un rol válido para el usuario.',
            duration: 4000,
          });
          return;
        }

        toast.error('Error en el Formulario', {
          description: 'Por Favor Verifique los Campos Obligatorios',
          duration: 3000,
        });
        return;
      }

      const pass = this.form.value.password;
      const conf = this.form.value.confirmation;

      if (this.isCreateMode()) {
        if (!pass || pass.length < 8) {
          toast.error('Error en la Contraseña', {
            description: 'La contraseña es requerida y debe tener al menos 8 caracteres',
            duration: 3000,
          });
          return;
        }
        if (pass !== conf) {
          toast.error('Error en la Contraseña', {
            description: 'Las contraseñas no coinciden',
            duration: 3000,
          });
          return;
        }
      } else {
        // En modo edición: si se llena alguno de los campos de contraseña, validamos
        if (pass || conf) {
          if ((pass || '').length < 8) {
            toast.error('Error en la Contraseña', {
              description: 'La nueva contraseña debe tener al menos 8 caracteres',
              duration: 3000,
            });
            return;
          }
          if (pass !== conf) {
            toast.error('Error en la Contraseña', {
              description: 'Las contraseñas no coinciden',
              duration: 3000,
            });
            return;
          }
        }
      }

      const data: any = {
        name: (this.form.value.name || '').trim(),
        surname: (this.form.value.surname || '').trim(),
        email: (this.form.value.email || '').trim(),
        role_id: Number(this.form.value.role_id),
      };

      if (!this.isCreateMode()) {
        data.id = this.userId()!;
      }

      if (pass) {
        data.password = pass;
      }

      if (this.isCreateMode()) {
        this._usersService.create(data).subscribe({
          next: () => {
            toast.success('Registro Creado', {
              description: `El usuario ${data.name} se creó correctamente.`,
              duration: 3000,
            });
            this._router.navigate(['/admin/users']);
          },
          error: (err) => {
            console.error('Error al crear usuario:', err);
            let detail = 'Error al crear el usuario en el servidor.';
            if (typeof err.error === 'string') {
              if (err.error.includes('Already Exists')) {
                detail = 'El correo electrónico ingresado ya se encuentra registrado.';
              } else {
                detail = err.error;
              }
            } else if (err.error?.errors && Array.isArray(err.error.errors)) {
              const firstErr = err.error.errors[0];
              if (firstErr?.constraints) {
                detail = Object.values(firstErr.constraints).join('. ');
              }
            } else if (err.error?.message) {
              detail = err.error.message;
            }

            toast.error('Error al Crear Usuario', {
              description: detail,
              duration: 5000,
            });
          },
        });
      } else {
        this._usersService.updateById(this.userId()!, data).subscribe({
          next: () => {
            toast.success('Registro Actualizado', {
              description: `El usuario ${data.name} se actualizó correctamente.`,
              duration: 3000,
            });
            this._router.navigate(['/admin/users']);
          },
          error: (err) => {
            console.error('Error al actualizar usuario:', err);
            let detail = 'Error al actualizar el usuario en el servidor.';
            if (typeof err.error === 'string') {
              if (err.error.includes('Already Exists')) {
                detail = 'El correo electrónico ingresado ya pertenece a otro usuario.';
              } else {
                detail = err.error;
              }
            } else if (err.error?.errors && Array.isArray(err.error.errors)) {
              const firstErr = err.error.errors[0];
              if (firstErr?.constraints) {
                detail = Object.values(firstErr.constraints).join('. ');
              }
            } else if (err.error?.message) {
              detail = err.error.message;
            }

            toast.error('Error al Actualizar Usuario', {
              description: detail,
              duration: 5000,
            });
          },
        });
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al Procesar el Registro', {
        description:
          'Error al procesar el registro, por favor intente nuevamente.',
        duration: 3000,
      });
    }
  }
}

export default AdminUsersFormComponent;
