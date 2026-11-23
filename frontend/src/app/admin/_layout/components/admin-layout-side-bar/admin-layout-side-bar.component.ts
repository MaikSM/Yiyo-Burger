import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  HostListener,
  ViewChild,
  ElementRef,
  AfterViewInit
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@auth/services/auth.service';
import { MesasService } from '@admin/services/mesas.service';
import { CierreCajaService } from '@admin/services/cierre-caja.service';
import { PedidosService } from '@admin/services/pedidos.service';
import { GastosService } from '@admin/services/gastos.service';
import { iMenuItem } from '@shared/interfaces';
import { CommonModule, DatePipe, LowerCasePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

export interface CambioCaja {
  id?: string;
  fecha: string;
  monto_anterior: number;
  monto_nuevo: number;
  motivo: string;
  tipo: 'Ingreso' | 'Gasto' | 'Apertura';
  monto_gasto?: number;
  metodo_pago?: string;
  categoria?: string;
}

export interface CajaDiaria {
  id: number | string;
  estado: 'Abierta' | 'Cerrada';
  fecha_apertura: string;
  base_inicial: number;
  base_actual: number;
  gastos_efectivo?: number;
  total_gastos?: number;
  historial_cambios: CambioCaja[];
  estadisticas?: any;
  ventas_efectivo?: number;
  ventas_tarjeta?: number;
  ventas_transferencia?: number;
  total_ventas?: number;
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'admin-layout-side-bar',
  imports: [RouterLink, RouterLinkActive, DatePipe, LowerCasePipe, CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-layout-side-bar.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutSideBarComponent implements OnInit, OnDestroy, AfterViewInit {
  public _authService: AuthService = inject(AuthService);
  private _router: Router = inject(Router);
  private _mesasService: MesasService = inject(MesasService);
  private _cierreCajaService: CierreCajaService = inject(CierreCajaService);
  private _pedidosService: PedidosService = inject(PedidosService);
  private _gastosService: GastosService = inject(GastosService);

  @ViewChild('navContainer') navContainer!: ElementRef<HTMLUListElement>;
  canScrollLeft = signal<boolean>(false);
  canScrollRight = signal<boolean>(false);

  currentTime = signal<Date>(new Date());
  private timer: any;
  private realTimeSub: any;

  caja = signal<CajaDiaria | null>(null);
  showCajaModal = signal(false);
  baseInput = signal<number | string>(50000);
  motivoInput = signal<string>('');
  
  montoGasto = signal<number | string>('');
  motivoGasto = signal<string>('');
  metodoGasto = signal<string>('Efectivo');
  categoriaGasto = signal<string>('Operativo');
  
  cajaResumen = signal<any>(null); // For closing stats
  mesasOcupadasError = signal<string | null>(null);
  cargandoMesas = signal<boolean>(false);
  montoRealContadoInput = signal<string>('');

  diferenciaArqueo = computed(() => {
    const contadoStr = this.montoRealContadoInput();
    const contado = parseFloat(contadoStr);
    const esperado = Number(this.cajaResumen()?.totalEsperado || 0);
    if (isNaN(contado)) return 0;
    return contado - esperado;
  });

  menuItems = signal<iMenuItem[]>([
    { path: '/admin', label: 'Mesas', icon: 'fas fa-chair' },
    { path: '/admin/domicilios', label: 'Domicilios', icon: 'fas fa-motorcycle' },
    { path: '/admin/roles', label: 'Roles', icon: 'fas fa-user-tag' },
    { path: '/admin/users', label: 'Usuarios', icon: 'fas fa-users' },
    { path: '/admin/clientes', label: 'Clientes', icon: 'fas fa-address-book' },
    { path: '/admin/menu', label: 'Menú', icon: 'fas fa-utensils' },
    { path: '/admin/inventario', label: 'Inventario', icon: 'fas fa-boxes' },
    { path: '/admin/reportes', label: 'Reportes', icon: 'fas fa-chart-bar' },
    { path: '/admin/auditoria-caja', label: 'Auditoría Caja', icon: 'fas fa-cash-register' },
    { path: '/admin/impresoras', label: 'Impresoras', icon: 'fas fa-print' },
    { path: '/admin/nomina', label: 'Nómina', icon: 'fas fa-calendar-alt' },
    { path: '/admin/profile', label: 'Perfil', icon: 'fas fa-user-cog' },
    {
      path: '/admin/reservas-mesas',
      label: 'Reservas mesas',
      icon: 'fas fa-calendar-check',
      hidden: true,
    },
    { path: '/admin/asistencia', label: 'Asistencia', icon: 'fas fa-clock', hidden: true },
  ]);

  public filteredMenuItems = computed(() => {
    const user = this._authService.user();
    const roleName = (user?.role?.name || '').toLowerCase();
    const items = this.menuItems();

    if (roleName === 'cajero') {
      // Cajero solo tiene acceso a flujo de pedidos (Mesas, Domicilios, Clientes, Perfil) y gestión de caja
      const allowedPaths = ['/admin', '/admin/domicilios', '/admin/clientes', '/admin/profile'];
      return items.filter(item => allowedPaths.includes(item.path));
    }

    return items;
  });

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event && typeof event.key === 'string' && event.key.startsWith('F')) {
      const match = event.key.match(/^F(\d+)$/);
      if (match) {
        const index = parseInt(match[1], 10) - 1;
        const items = this.menuItems();
        if (index >= 0 && index < items.length) {
          const target = items[index];
          if (!target.hidden && !target.disabled) {
            event.preventDefault();
            this._router.navigate([target.path]);
          }
        }
      }
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.checkScroll();
  }

  ngOnInit() {
    this.timer = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
    this.loadCaja();

    this.realTimeSub = this._pedidosService.getEventsStream().subscribe({
      next: (evt) => {
        if (
          evt?.type === 'pedido_created' ||
          evt?.type === 'pedido_updated' ||
          evt?.type === 'pedido_deleted' ||
          evt?.type === 'gasto_changed' ||
          evt?.type === 'caja_changed'
        ) {
          this.loadCaja();
        }
      },
      error: () => {},
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.checkScroll(), 100);
  }

  checkScroll(): void {
    const el = this.navContainer?.nativeElement;
    if (!el) return;
    const isOverflowing = el.scrollWidth > el.clientWidth;
    this.canScrollLeft.set(isOverflowing && el.scrollLeft > 2);
    this.canScrollRight.set(isOverflowing && el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }

  scrollNav(direction: 'left' | 'right'): void {
    const el = this.navContainer?.nativeElement;
    if (!el) return;
    const amount = direction === 'left' ? -200 : 200;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  }

  onWheelScroll(event: WheelEvent): void {
    const el = this.navContainer?.nativeElement;
    if (!el || window.innerWidth < 768) return;
    if (el.scrollWidth > el.clientWidth) {
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        event.preventDefault();
        el.scrollLeft += event.deltaY;
      }
    }
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    if (this.realTimeSub) {
      this.realTimeSub.unsubscribe();
    }
  }

  private mapBackendGastos(gastosBD: any[]): CambioCaja[] {
    return (gastosBD || []).map((g: any) => ({
      id: g.id,
      fecha: g.created_at || g.fecha,
      monto_anterior: 0,
      monto_nuevo: 0,
      motivo: g.motivo,
      tipo: 'Gasto' as const,
      monto_gasto: Number(g.monto) || 0,
      metodo_pago: g.metodo_pago || 'Efectivo',
      categoria: g.categoria || 'Operativo',
    }));
  }

  loadCaja() {
    this._cierreCajaService.getTurnoAbierto().subscribe({
      next: (res) => {
        if (res && res.abierto && res.data) {
          const t = res.data;
          const baseInicial = Number(t.monto_inicial) || 0;
          const vEfectivo = Number(t.ventas_efectivo) || 0;
          const vTarjeta = Number(t.ventas_tarjeta) || 0;
          const vTransferencia = Number(t.ventas_transferencia) || 0;

          const applyWithGastos = (gastosList: any[]) => {
            const mappedGastos = this.mapBackendGastos(gastosList);
            const gastosEfectivo = mappedGastos
              .filter((g) => (g.metodo_pago || 'Efectivo').toLowerCase().includes('efectivo'))
              .reduce((sum, g) => sum + Number(g.monto_gasto || 0), 0);
            const totalGastos = mappedGastos.reduce((sum, g) => sum + Number(g.monto_gasto || 0), 0);
            const baseActualCalc = baseInicial + vEfectivo - gastosEfectivo;

            this.caja.set({
              id: t.id,
              estado: 'Abierta',
              fecha_apertura: t.fecha_apertura,
              base_inicial: baseInicial,
              base_actual: baseActualCalc,
              gastos_efectivo: gastosEfectivo,
              total_gastos: totalGastos,
              historial_cambios: mappedGastos,
              estadisticas: t,
              ventas_efectivo: vEfectivo,
              ventas_tarjeta: vTarjeta,
              ventas_transferencia: vTransferencia,
              total_ventas: Number(t.total_ventas) || 0,
            });
          };

          if (Array.isArray(t.gastos_lista)) {
            applyWithGastos(t.gastos_lista);
          } else {
            this._gastosService.getAll(undefined, Number(t.id)).subscribe({
              next: (gastosBD) => applyWithGastos(gastosBD || []),
              error: () => applyWithGastos([]),
            });
          }
        } else {
          this.caja.set(null);
        }
      },
      error: () => this.caja.set(null),
    });
  }

  abrirCajaModal() {
    this.showCajaModal.set(true);
    this.loadCaja();
    const actualCaja = this.caja();
    this.baseInput.set(actualCaja ? actualCaja.base_actual : 50000);
    this.motivoInput.set('');
    this.montoGasto.set('');
    this.motivoGasto.set('');
    this.metodoGasto.set('Efectivo');
    this.categoriaGasto.set('Operativo');
    this.cajaResumen.set(null);
    this.mesasOcupadasError.set(null);

    setTimeout(() => {
      const inputEl = document.querySelector('input[placeholder*="50000"]') as HTMLInputElement;
      if (inputEl) {
        inputEl.focus();
        inputEl.select();
      }
    }, 100);
  }

  cerrarModalCaja() {
    this.showCajaModal.set(false);
    this.mesasOcupadasError.set(null);
  }

  confirmarApertura() {
    const val = Number(this.baseInput());
    if (isNaN(val) || val < 0) return;
    const user = this._authService.user();
    const usuarioId = user?.id ? parseInt(String(user.id)) : 1;
    const usuarioNombre = user ? `${user.name || ''} ${user.surname || ''}`.trim() : 'Cajero Central';

    this._cierreCajaService.abrirCaja(usuarioId, usuarioNombre, val).subscribe({
      next: () => {
        this.loadCaja();
        this.cerrarModalCaja();
      },
      error: (err) => {
        alert(err.error?.message || 'Error al abrir el turno de caja en la base de datos');
      },
    });
  }

  registrarGasto() {
    const actualCaja = this.caja();
    const monto = Number(this.montoGasto()) || 0;
    const motivo = (this.motivoGasto() || '').trim();
    const metodoPago = this.metodoGasto() || 'Efectivo';
    const categoria = this.categoriaGasto() || 'Operativo';
    if (!actualCaja || monto <= 0 || !motivo) return;

    const user = this._authService.user();
    const usuarioNombre = user ? `${user.name || ''} ${user.surname || ''}`.trim() : 'Cajero Central';
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const payloadGasto = {
      cierre_id: Number(actualCaja.id),
      fecha: todayStr,
      monto: monto,
      metodo_pago: metodoPago,
      motivo: motivo,
      categoria: categoria,
      usuario_nombre: usuarioNombre,
    };

    this._gastosService.create(payloadGasto).subscribe({
      next: () => {
        this.montoGasto.set('');
        this.motivoGasto.set('');
        this.metodoGasto.set('Efectivo');
        this.categoriaGasto.set('Operativo');
        this.loadCaja();
        alert(`✅ Egreso de $${monto.toLocaleString('es-CO')} (${metodoPago}) registrado en la base de datos y aplicado al cierre de caja.`);
      },
      error: (err: any) => {
        console.error('Error guardando egreso en el servidor:', err);
        alert(err.error?.message || 'Error al guardar el egreso en la base de datos');
      },
    });
  }

  eliminarGastoTurno(gastoId?: string) {
    if (!gastoId) return;
    if (!confirm('¿Seguro que deseas eliminar este egreso registrado en el turno?')) return;

    this._gastosService.delete(gastoId).subscribe({
      next: () => {
        this.loadCaja();
        if (this.cajaResumen()) {
          this.prepararCierre();
        }
      },
      error: (err: any) => {
        alert(err.error?.message || 'Error al eliminar el egreso de la base de datos');
      },
    });
  }

  async prepararCierre() {
    const actualCaja = this.caja();
    if (!actualCaja) return;

    this.mesasOcupadasError.set(null);
    this.cargandoMesas.set(true);

    try {
      const [mesas, turnoRes] = await Promise.all([
        firstValueFrom(this._mesasService.getAll(true)),
        firstValueFrom(this._cierreCajaService.getTurnoAbierto()),
      ]);

      const mesasNoLibres = (mesas || []).filter((m) => m.estado !== 'libre');
      if (mesasNoLibres.length > 0) {
        this.mesasOcupadasError.set(
          `No se puede cerrar la caja del día: Existe(n) ${mesasNoLibres.length} mesa(s) que aún no está(n) libre(s). Por favor libera todas las mesas antes de continuar.`
        );
      }

      const t = turnoRes?.data || actualCaja.estadisticas || {};
      const baseInicial = Number(t.monto_inicial ?? actualCaja.base_inicial ?? 0);
      const vEfectivo = Number(t.ventas_efectivo ?? 0);
      const vTarjeta = Number(t.ventas_tarjeta ?? 0);
      const vTransferencia = Number(t.ventas_transferencia ?? 0);
      const vOtros = Number(t.ventas_otros ?? 0);
      const vTotales = Number(t.total_ventas ?? (vEfectivo + vTarjeta + vTransferencia));

      const gastosList = Array.isArray(t.gastos_lista)
        ? this.mapBackendGastos(t.gastos_lista)
        : actualCaja.historial_cambios || [];

      const gastosEfectivo = Number(
        t.gastos_efectivo ??
          gastosList
            .filter((g: any) => (g.metodo_pago || 'Efectivo').toLowerCase().includes('efectivo'))
            .reduce((sum: number, g: any) => sum + Number(g.monto_gasto || 0), 0)
      );
      const totalGastos = Number(
        t.total_gastos ?? gastosList.reduce((sum: number, g: any) => sum + Number(g.monto_gasto || 0), 0)
      );

      const totalEsperadoCalc = baseInicial + vEfectivo - gastosEfectivo;
      this.montoRealContadoInput.set(String(totalEsperadoCalc));

      const resumenMetodos = Array.isArray(t.resumen_metodos)
        ? t.resumen_metodos
        : [
            { metodo: 'Efectivo', total: vEfectivo, cantidad: 0 },
            { metodo: 'Tarjeta', total: vTarjeta, cantidad: 0 },
            { metodo: 'Transferencia', total: vTransferencia, cantidad: 0 },
          ];

      const transacciones = Array.isArray(t.transacciones) ? t.transacciones : [];

      this.cajaResumen.set({
        baseInicial,
        baseActual: totalEsperadoCalc,
        ventasMesas: Number(t.ventas_mesas ?? 0),
        ventasMesasCant: Number(t.ventas_mesas_cant ?? 0),
        ventasDomicilios: Number(t.ventas_domicilios ?? 0),
        ventasDomiciliosCant: Number(t.ventas_domicilios_cant ?? 0),
        ventasTotales: vTotales,
        ventasEfectivo: vEfectivo,
        ventasTarjeta: vTarjeta,
        ventasTransferencia: vTransferencia,
        ventasOtros: vOtros,
        gastosEfectivo,
        totalGastos,
        totalEsperado: totalEsperadoCalc,
        resumenMetodos,
        transacciones,
        gastos: gastosList,
        totalTransacciones: Number(t.total_transacciones ?? transacciones.length),
      });
    } catch (e) {
      console.error('Error preparando cierre de caja:', e);
    } finally {
      this.cargandoMesas.set(false);
    }
  }

  async confirmarCierre() {
    const actualCaja = this.caja();
    if (!actualCaja || !this.cajaResumen()) return;

    this.mesasOcupadasError.set(null);
    this.cargandoMesas.set(true);

    try {
      const mesas = await firstValueFrom(this._mesasService.getAll(true));
      const mesasNoLibres = (mesas || []).filter(m => m.estado !== 'libre');
      if (mesasNoLibres.length > 0) {
        this.mesasOcupadasError.set(
          `No se puede cerrar la caja del día: Existe(n) ${mesasNoLibres.length} mesa(s) que aún no está(n) libre(s). Por favor libera todas las mesas antes de continuar.`
        );
        this.cargandoMesas.set(false);
        return;
      }
    } catch (err) {
      console.error('Error al verificar estado de las mesas:', err);
    } finally {
      this.cargandoMesas.set(false);
    }

    const inputVal = parseFloat(this.montoRealContadoInput());
    const montoReal = isNaN(inputVal) ? (this.cajaResumen()?.totalEsperado || actualCaja.base_actual) : inputVal;

    this._cierreCajaService.cerrarCaja(actualCaja.id, montoReal, 'Cierre regular de caja').subscribe({
      next: () => {
        this.caja.set(null);
        this.cerrarModalCaja();
      },
      error: (err) => {
        const errorMsg = err.error?.message || 'Error al cerrar el turno de caja';
        this.mesasOcupadasError.set(errorMsg);
      }
    });
  }

  logout(): void {
    try {
      if (confirm('¿Está seguro de que desea cerrar sesión?')) {
        this._authService.logout();
        this._router.navigate(['/auth/login']);
      }
    } catch (error) {
      console.error(error);
    }
  }
}

export default AdminLayoutSideBarComponent;
