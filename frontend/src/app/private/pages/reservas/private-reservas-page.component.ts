import { CommonModule } from '@angular/common';
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
import { Router } from '@angular/router';
import { AuthService } from '@auth/services/auth.service';
import { ReservasService } from '@admin/services/reservas.service';
import { toast } from 'ngx-sonner';
import { Mesa, CreateReserva } from '@shared/interfaces';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'private-reservas-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './private-reservas-page.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivateReservasPageComponent {
  private _authService: AuthService = inject(AuthService);
  private _reservasService: ReservasService = inject(ReservasService);
  private _router: Router = inject(Router);
  private _formBuilder: FormBuilder = inject(FormBuilder);

  mesas = signal<Mesa[]>([]);
  hasError = signal<boolean>(false);
  isPosting = signal<boolean>(false);
  isLoadingMesas = signal<boolean>(true);

  reservaForm: FormGroup = this._formBuilder.group({
    mesa_id: ['', [Validators.required]],
    cliente_nombre: ['', [Validators.required, Validators.minLength(2)]],
    cliente_email: ['', [Validators.required, Validators.email]],
    cliente_telefono: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s\-\(\)]+$/)]],
    fecha_hora: ['', [Validators.required]],
    numero_personas: ['', [Validators.required, Validators.min(1), Validators.max(20)]],
    notas: [''],
  });

  constructor() {
    this.loadMesas();
  }

  loadMesas(): void {
    this._reservasService.getMesas().subscribe({
      next: (mesas) => {
        // Filtrar mesas libres
        const mesasLibres = mesas.filter(mesa => mesa.estado === 'libre');
        this.mesas.set(mesasLibres);
        this.isLoadingMesas.set(false);
      },
      error: (error) => {
        console.error('Error loading mesas:', error);
        toast.error('Error al cargar mesas', {
          description: 'No se pudieron cargar las mesas disponibles',
        });
        this.isLoadingMesas.set(false);
      },
    });
  }

  onSubmit(): void {
    if (this.reservaForm.invalid) {
      toast.error('Formulario inválido', {
        description: 'Por favor, completa todos los campos requeridos',
      });
      return;
    }

    const formValue = this.reservaForm.value;
    const reservaData: CreateReserva = {
      mesa_id: parseInt(formValue.mesa_id),
      cliente_nombre: formValue.cliente_nombre,
      cliente_telefono: formValue.cliente_telefono,
      fecha_hora: formValue.fecha_hora,
      numero_personas: parseInt(formValue.numero_personas),
      notas: formValue.notas || '',
    };

    this.isPosting.set(true);

    this._reservasService.createReserva(reservaData).subscribe({
      next: (reserva) => {
        toast.success('Reserva creada exitosamente', {
          description: 'Tu reserva ha sido confirmada',
        });
        this._router.navigate(['/']);
      },
      error: (error) => {
        console.error('Error creating reserva:', error);
        toast.error('Error al crear reserva', {
          description: 'Por favor, intenta nuevamente',
        });
        this.isPosting.set(false);
      },
    });
  }

  getMesaCapacidad(mesaId: number): number {
    const mesa = this.mesas().find(m => m.id === mesaId);
    return mesa?.capacidad || 0;
  }

  getMinDateTime(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }
}

export default PrivateReservasPageComponent;