import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  signal,
  OnDestroy,
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
import { Mesa, CreateReserva, Reserva } from '@shared/interfaces';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'private-reservas-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './private-reservas-page.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivateReservasPageComponent implements OnDestroy {
  private _authService: AuthService = inject(AuthService);
  private _reservasService: ReservasService = inject(ReservasService);
  private _router: Router = inject(Router);
  private _formBuilder: FormBuilder = inject(FormBuilder);
  private _cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

  mesas = signal<Mesa[]>([]);
  misReservas = signal<Reserva[]>([]);
  hasError = signal<boolean>(false);
  isPosting = signal<boolean>(false);
  isLoadingMesas = signal<boolean>(true);
  isLoadingReservas = signal<boolean>(true);
  activeTab = signal<'crear' | 'mis-reservas'>('crear');

  // Polling para actualizar reservas automáticamente
  private _pollingSubscription?: Subscription;
  private readonly _pollingInterval = 30000; // 30 segundos

  reservaForm: FormGroup = this._formBuilder.group({
    mesa_id: ['', [Validators.required]],
    cliente_nombre: ['', [Validators.required, Validators.minLength(2)]],
    cliente_email: ['', [Validators.required, Validators.email]],
    cliente_telefono: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s\-()]+$/)]],
    fecha_hora: ['', [Validators.required]],
    numero_personas: ['', [Validators.required, Validators.min(1), Validators.max(20)]],
    notas: [''],
  });

  constructor() {
    this.loadMesas();
    this.loadMisReservas();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private startPolling(): void {
    // Actualizar reservas cada 30 segundos cuando está en la pestaña de mis-reservas
    this._pollingSubscription = interval(this._pollingInterval).subscribe(() => {
      if (this.activeTab() === 'mis-reservas') {
        this.loadMisReservas();
      }
    });
  }

  private stopPolling(): void {
    if (this._pollingSubscription) {
      this._pollingSubscription.unsubscribe();
    }
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

  loadMisReservas(): void {
    this.isLoadingReservas.set(true);
    this._reservasService.getMisReservas().subscribe({
      next: (reservas) => {
        this.misReservas.set(reservas);
        this.isLoadingReservas.set(false);
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading mis reservas:', error);
        toast.error('Error al cargar mis reservas', {
          description: 'No se pudieron cargar tus reservas',
        });
        this.isLoadingReservas.set(false);
        this._cdr.markForCheck();
      },
    });
  }

  switchTab(tab: 'crear' | 'mis-reservas'): void {
    this.activeTab.set(tab);
    if (tab === 'mis-reservas') {
      this.loadMisReservas();
    }
  }

  onSubmit(): void {
    if (this.reservaForm.invalid) {
      toast.error('Formulario inválido', {
        description: 'Por favor, completa todos los campos requeridos',
      });
      return;
    }

    const formValue = this.reservaForm.value;
    // Convertir la fecha del formato datetime-local a ISO 8601
    const fechaHoraISO = new Date(formValue.fecha_hora).toISOString();
    const reservaData: CreateReserva = {
      mesa_id: parseInt(formValue.mesa_id),
      cliente_nombre: formValue.cliente_nombre,
      cliente_telefono: formValue.cliente_telefono,
      fecha_hora: fechaHoraISO,
      numero_personas: parseInt(formValue.numero_personas),
      notas: formValue.notas || '',
    };

    this.isPosting.set(true);

    this._reservasService.createReserva(reservaData).subscribe({
      next: (reserva) => {
        toast.success('Reserva creada exitosamente', {
          description: 'Tu reserva ha sido confirmada',
        });
        this.reservaForm.reset();
        this.loadMesas();
        this.loadMisReservas();
        this.switchTab('mis-reservas');
        this.isPosting.set(false);
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

  cancelarReserva(reservaId: number): void {
    if (!confirm('¿Estás seguro de que quieres cancelar esta reserva?')) {
      return;
    }

    this._reservasService.cancelarReserva(reservaId).subscribe({
      next: () => {
        toast.success('Reserva cancelada', {
          description: 'Tu reserva ha sido cancelada exitosamente',
        });
        this.loadMisReservas();
      },
      error: (error: any) => {
        console.error('Error cancelling reserva:', error);
        toast.error('Error al cancelar reserva', {
          description: 'No se pudo cancelar la reserva',
        });
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

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'confirmado':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'cancelada':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'completada':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

export default PrivateReservasPageComponent;
