import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CierreCajaService } from '../../services/cierre-caja.service';
import { PedidosService } from '../../services/pedidos.service';

@Component({
  selector: 'admin-auditoria-caja-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-auditoria-caja-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAuditoriaCajaPageComponent implements OnInit, OnDestroy {
  private cierreCajaService = inject(CierreCajaService);
  private pedidosService = inject(PedidosService);
  private realTimeSub?: any;

  historialCierresBD = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  estadoFilter = signal<'todos' | 'Abierto' | 'Cerrado'>('todos');
  searchTerm = signal<string>('');
  selectedTurno = signal<any | null>(null);

  filteredCierres = computed(() => {
    const list = this.historialCierresBD();
    const estado = this.estadoFilter();
    const term = this.searchTerm().trim().toLowerCase();

    return list.filter((c) => {
      if (estado !== 'todos' && c.estado !== estado) return false;
      if (!term) return true;
      const hay = `${c.id} ${c.usuario_nombre || ''} ${c.observaciones || ''} ${c.fecha_apertura || ''}`.toLowerCase();
      return hay.includes(term);
    });
  });

  turnoActivo = computed(() => this.historialCierresBD().find((c) => c.estado === 'Abierto') || null);

  totalVentasEfectivo = computed(() =>
    this.filteredCierres().reduce((sum, c) => sum + (Number(c.ventas_efectivo) || 0), 0)
  );

  totalEgresosEfectivo = computed(() =>
    this.filteredCierres().reduce((sum, c) => sum + (Number(c.gastos_efectivo) || 0), 0)
  );

  totalDiferenciaCerrados = computed(() =>
    this.filteredCierres()
      .filter((c) => c.estado !== 'Abierto')
      .reduce((sum, c) => sum + (Number(c.diferencia) || 0), 0)
  );

  ngOnInit(): void {
    this.cargarHistorial();
    this.realTimeSub = this.pedidosService.getEventsStream().subscribe({
      next: (evt) => {
        if (
          evt?.type === 'caja_changed' ||
          evt?.type === 'gasto_changed' ||
          evt?.type === 'pedido_updated' ||
          evt?.type === 'pedido_created'
        ) {
          this.cargarHistorial(true);
        }
      },
      error: () => {},
    });
  }

  ngOnDestroy(): void {
    if (this.realTimeSub) this.realTimeSub.unsubscribe();
  }

  cargarHistorial(silent: boolean = false): void {
    if (!silent) this.isLoading.set(true);
    this.cierreCajaService.getHistorial().subscribe({
      next: (cierres) => {
        this.historialCierresBD.set(cierres || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando auditoría de turnos de caja:', err);
        this.isLoading.set(false);
      },
    });
  }

  verDetalleTurno(turno: any): void {
    this.selectedTurno.set(this.selectedTurno()?.id === turno.id ? null : turno);
  }
}

export default AdminAuditoriaCajaPageComponent;
