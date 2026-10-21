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
  fecha: string;
  monto_anterior: number;
  monto_nuevo: number;
  motivo: string;
  tipo: 'Ingreso' | 'Gasto' | 'Apertura';
  monto_gasto?: number;
  metodo_pago?: string;
}

export interface CajaDiaria {
  id: number | string;
  estado: 'Abierta' | 'Cerrada';
  fecha_apertura: string;
  base_inicial: number;
  base_actual: number;
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

  caja = signal<CajaDiaria | null>(null);
  showCajaModal = signal(false);
  baseInput = signal<number | string>(50000);
  motivoInput = signal<string>('');
  
  montoGasto = signal<number | string>('');
  motivoGasto = signal<string>('');
  
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
  }

  getGastosFromStorage(cajaId: number | string): any[] {
    try {
      const key = `restausync_caja_gastos_${cajaId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error cargando gastos de storage:', e);
    }
    return [];
  }

  saveGastosToStorage(cajaId: number | string, gastos: any[]) {
    try {
      const key = `restausync_caja_gastos_${cajaId}`;
      localStorage.setItem(key, JSON.stringify(gastos));
      
      // Sincronizar también con restausync_gastos_diarios para el módulo de Reportes
      const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
      const storedReportes = localStorage.getItem('restausync_gastos_diarios');
      let gastosMap: Record<string, any[]> = storedReportes ? JSON.parse(storedReportes) : {};
      
      const reportesGastos = gastos.map(g => ({
        id: g.fecha,
        fecha: g.fecha,
        monto: Number(g.monto_gasto || g.monto || 0),
        motivo: g.motivo || 'Gasto de caja',
        metodoPago: g.metodo_pago || 'Efectivo',
        categoria: 'Operativo'
      }));
      
      gastosMap[todayStr] = reportesGastos;
      localStorage.setItem('restausync_gastos_diarios', JSON.stringify(gastosMap));
    } catch (e) {
      console.error('Error guardando gastos en storage:', e);
    }
  }

  loadCaja() {
    this._cierreCajaService.getTurnoAbierto().subscribe({
      next: (res) => {
        if (res && res.abierto && res.data) {
          const t = res.data;

          this._gastosService.getAll(undefined, Number(t.id)).subscribe({
            next: (gastosBD) => {
              const localGastos = (gastosBD || []).map((g: any) => ({
                id: g.id,
                fecha: g.created_at || g.fecha,
                monto_anterior: 0,
                monto_nuevo: 0,
                motivo: g.motivo,
                tipo: 'Gasto' as const,
                monto_gasto: Number(g.monto) || 0,
                metodo_pago: g.metodo_pago || 'Efectivo'
              }));

              this.saveGastosToStorage(t.id, localGastos);

              const totalGastos = localGastos.reduce((sum: number, g: any) => sum + Number(g.monto_gasto || 0), 0);
              const baseInicial = Number(t.monto_inicial) || 0;
              const vEfectivo = Number(t.ventas_efectivo) || 0;
              const baseActualCalc = baseInicial + vEfectivo - totalGastos;

              this.caja.set({
                id: t.id,
                estado: 'Abierta',
                fecha_apertura: t.fecha_apertura,
                base_inicial: baseInicial,
                base_actual: baseActualCalc,
                historial_cambios: localGastos,
                estadisticas: t,
                ventas_efectivo: vEfectivo,
                ventas_tarjeta: Number(t.ventas_tarjeta) || 0,
                ventas_transferencia: Number(t.ventas_transferencia) || 0,
                total_ventas: Number(t.total_ventas) || 0,
              });
            },
            error: () => {
              const localGastos = this.getGastosFromStorage(t.id);
              const totalGastos = localGastos.reduce((sum: number, g: any) => sum + Number(g.monto_gasto || g.monto || 0), 0);
              const baseInicial = Number(t.monto_inicial) || 0;
              const vEfectivo = Number(t.ventas_efectivo) || 0;
              const baseActualCalc = baseInicial + vEfectivo - totalGastos;

              this.caja.set({
                id: t.id,
                estado: 'Abierta',
                fecha_apertura: t.fecha_apertura,
                base_inicial: baseInicial,
                base_actual: baseActualCalc,
                historial_cambios: localGastos,
                estadisticas: t,
                ventas_efectivo: vEfectivo,
                ventas_tarjeta: Number(t.ventas_tarjeta) || 0,
                ventas_transferencia: Number(t.ventas_transferencia) || 0,
                total_ventas: Number(t.total_ventas) || 0,
              });
            }
          });
        } else {
          this.caja.set(null);
        }
      },
      error: () => this.caja.set(null)
    });
  }

  abrirCajaModal() {
    this.showCajaModal.set(true);
    const actualCaja = this.caja();
    this.baseInput.set(actualCaja ? actualCaja.base_actual : 50000);
    this.motivoInput.set('');
    this.montoGasto.set('');
    this.motivoGasto.set('');
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
      }
    });
  }

  registrarGasto() {
    const actualCaja = this.caja();
    const monto = Number(this.montoGasto()) || 0;
    const motivo = (this.motivoGasto() || '').trim();
    if (!actualCaja || monto <= 0 || !motivo) return;

    const user = this._authService.user();
    const usuarioNombre = user ? `${user.name || ''} ${user.surname || ''}`.trim() : 'Cajero Central';
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const payloadGasto = {
      cierre_id: Number(actualCaja.id),
      fecha: todayStr,
      monto: monto,
      metodo_pago: 'Efectivo',
      motivo: motivo,
      categoria: 'Operativo',
      usuario_nombre: usuarioNombre
    };

    this._gastosService.create(payloadGasto).subscribe({
      next: (gastoCreado: any) => {
        const historial = actualCaja.historial_cambios || [];
        const nuevoMonto = actualCaja.base_actual - monto;

        const gastoItem = {
          id: gastoCreado?.id,
          fecha: gastoCreado?.created_at || now.toISOString(),
          monto_anterior: actualCaja.base_actual,
          monto_nuevo: nuevoMonto,
          motivo: motivo,
          tipo: 'Gasto' as const,
          monto_gasto: monto,
          metodo_pago: 'Efectivo'
        };

        historial.unshift(gastoItem);
        actualCaja.historial_cambios = historial;
        actualCaja.base_actual = nuevoMonto;

        this.saveGastosToStorage(actualCaja.id, historial);
        this.caja.set({ ...actualCaja });
        this.montoGasto.set('');
        this.motivoGasto.set('');
        alert(`✅ Egreso de $${monto.toLocaleString()} registrado exitosamente en la base de datos y descontado del cierre de caja.`);
      },
      error: (err: any) => {
        console.error('Error guardando egreso en el servidor:', err);
        alert(err.error?.message || 'Error al guardar el egreso en la base de datos');
      }
    });
  }

  async prepararCierre() {
    const actualCaja = this.caja();
    if (!actualCaja) return;

    this.mesasOcupadasError.set(null);

    // Cargar historial de gastos actualizado de storage
    const localGastos = this.getGastosFromStorage(actualCaja.id);
    actualCaja.historial_cambios = localGastos;

    const totalGastos = localGastos
      .filter((c: any) => c.tipo === 'Gasto')
      .reduce((sum: number, c: any) => sum + Number(c.monto_gasto || c.monto || 0), 0);

    const vEfectivo = actualCaja.ventas_efectivo || 0;
    const vTarjeta = actualCaja.ventas_tarjeta || 0;
    const vTransferencia = actualCaja.ventas_transferencia || 0;
    const vTotales = actualCaja.total_ventas || (vEfectivo + vTarjeta + vTransferencia);
    const totalEsperadoFisico = actualCaja.base_inicial + vEfectivo - totalGastos;
    const gastos = (actualCaja.historial_cambios || []).filter((c: any) => c.tipo === 'Gasto');

    this.cajaResumen.set({
      baseInicial: actualCaja.base_inicial,
      baseActual: actualCaja.base_actual,
      ventasMesas: 0,
      ventasMesasCant: 0,
      ventasDomicilios: 0,
      ventasDomiciliosCant: 0,
      ventasTotales: vTotales,
      ventasEfectivo: vEfectivo,
      ventasTarjeta: vTarjeta,
      ventasTransferencia: vTransferencia,
      ventasOtros: 0,
      totalGastos,
      totalEsperado: totalEsperadoFisico,
      resumenMetodos: [
        { metodo: 'Efectivo', total: vEfectivo, cantidad: 0 },
        { metodo: 'Tarjeta', total: vTarjeta, cantidad: 0 },
        { metodo: 'Transferencia', total: vTransferencia, cantidad: 0 }
      ],
      transacciones: [],
      gastos,
      totalTransacciones: 0
    });

    // Cargar desglose detallado de mesas y transacciones en segundo plano de forma asíncrona
    this.cargandoMesas.set(true);

    try {
      const mesas = await firstValueFrom(this._mesasService.getAll());
      const mesasNoLibres = (mesas || []).filter(m => m.estado !== 'libre');
      if (mesasNoLibres.length > 0) {
        this.mesasOcupadasError.set(
          `No se puede cerrar la caja del día: Existe(n) ${mesasNoLibres.length} mesa(s) que aún no está(n) libre(s). Por favor libera todas las mesas antes de continuar.`
        );
      }
    } catch (err) {
      console.error('Error al verificar estado de las mesas:', err);
    } finally {
      this.cargandoMesas.set(false);
    }

    try {
      const pedidos = await firstValueFrom(this._pedidosService.getToday());
      const fechaApertura = new Date(actualCaja.fecha_apertura).getTime();

      const pedidosHoy = (pedidos || []).filter((p: any) => p.tipo !== 'Domicilio' && (p.estado === 'Completado' || p.estado === 'Pagado') && new Date(p.fecha).getTime() >= fechaApertura);
      const domiciliosHoy = (pedidos || []).filter((p: any) => p.tipo === 'Domicilio' && (p.estado === 'Completado' || p.estado === 'Pagado') && new Date(p.fecha).getTime() >= fechaApertura);

      const totalPedidos = pedidosHoy.reduce((sum: number, p: any) => sum + Number(p.total || 0), 0);
      const totalDomicilios = domiciliosHoy.reduce((sum: number, p: any) => sum + Number(p.total || 0), 0);
      const ventasTotalesCalc = totalPedidos + totalDomicilios;
      const totalTransacciones = pedidosHoy.length + domiciliosHoy.length;

      const todosLosPedidos = [
        ...pedidosHoy.map((p: any) => ({ ...p, tipo: 'Mesa' })),
        ...domiciliosHoy.map((d: any) => ({ ...d, tipo: 'Domicilio' }))
      ];
      
      todosLosPedidos.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

      const normalizarMetodo = (m: string): string => {
        const normalized = (m || '').trim().toLowerCase();
        if (normalized.includes('efectivo')) return 'Efectivo';
        if (normalized.includes('tarjeta') || normalized.includes('datáfono') || normalized.includes('datafono') || normalized.includes('bold') || normalized.includes('debito') || normalized.includes('credito')) return 'Tarjeta';
        if (
          normalized.includes('transferencia') || 
          normalized.includes('daviplata') || 
          normalized.includes('nequi') || 
          normalized.includes('transfiya') || 
          normalized.includes('bancolombia')
        ) {
          return 'Transferencia';
        }
        return 'Otros';
      };

      let vEfectivoCalc = 0;
      let vTarjetaCalc = 0;
      let vTransferenciaCalc = 0;
      let vOtrosCalc = 0;
      let cantEfectivo = 0, cantTarjeta = 0, cantTransferencia = 0, cantOtros = 0;

      for (const p of todosLosPedidos) {
        let pmList: { metodo: string; monto: number }[] = [];
        if (Array.isArray(p.pagos_mixtos)) {
          pmList = p.pagos_mixtos;
        } else if (typeof p.pagos_mixtos === 'string') {
          try {
            const parsed = JSON.parse(p.pagos_mixtos);
            if (Array.isArray(parsed)) pmList = parsed;
          } catch (e) {}
        }

        if (pmList.length > 0) {
          for (const sub of pmList) {
            const subMonto = Number(sub.monto) || 0;
            if (subMonto <= 0) continue;
            const cat = normalizarMetodo(sub.metodo);
            if (cat === 'Efectivo') { vEfectivoCalc += subMonto; cantEfectivo++; }
            else if (cat === 'Tarjeta') { vTarjetaCalc += subMonto; cantTarjeta++; }
            else if (cat === 'Transferencia') { vTransferenciaCalc += subMonto; cantTransferencia++; }
            else { vOtrosCalc += subMonto; cantOtros++; }
          }
        } else {
          const monto = Number(p.total) || 0;
          const cat = normalizarMetodo(p.metodo_pago);
          if (cat === 'Efectivo') { vEfectivoCalc += monto; cantEfectivo++; }
          else if (cat === 'Tarjeta') { vTarjetaCalc += monto; cantTarjeta++; }
          else if (cat === 'Transferencia') { vTransferenciaCalc += monto; cantTransferencia++; }
          else { vOtrosCalc += monto; cantOtros++; }
        }
      }

      const resumenMetodos = [
        { metodo: 'Efectivo', total: vEfectivoCalc, cantidad: cantEfectivo },
        { metodo: 'Tarjeta', total: vTarjetaCalc, cantidad: cantTarjeta },
        { metodo: 'Transferencia', total: vTransferenciaCalc, cantidad: cantTransferencia },
        { metodo: 'Otros', total: vOtrosCalc, cantidad: cantOtros }
      ];

      const totalEsperadoCalc = Math.max(0, Number(actualCaja.base_inicial || 0) + vEfectivoCalc - totalGastos);
      this.montoRealContadoInput.set(String(totalEsperadoCalc));

      const transacciones = todosLosPedidos.map((p: any) => {
        let descripcion = p.tipo === 'Mesa'
          ? `Mesa ${p.mesa_numero || p.mesa || 'Llevar/Otros'}`
          : `Domicilio - ${p.cliente_nombre || p.cliente || 'Sin nombre'}`;
        return {
          id: p.id,
          hora: p.fecha,
          tipo: p.tipo,
          descripcion,
          metodo_pago: p.metodo_pago || 'Otros',
          total: Number(p.total || 0),
          vuelto: p.vuelto || 0,
          propina_valor: Number(p.propina_valor || 0)
        };
      });

      this.cajaResumen.set({
        baseInicial: actualCaja.base_inicial,
        baseActual: actualCaja.base_actual,
        ventasMesas: totalPedidos,
        ventasMesasCant: pedidosHoy.length,
        ventasDomicilios: totalDomicilios,
        ventasDomiciliosCant: domiciliosHoy.length,
        ventasTotales: ventasTotalesCalc || vTotales,
        ventasEfectivo: vEfectivoCalc,
        ventasTarjeta: vTarjetaCalc,
        ventasTransferencia: vTransferenciaCalc,
        ventasOtros: vOtrosCalc,
        totalGastos,
        totalEsperado: totalEsperadoCalc,
        resumenMetodos,
        transacciones,
        gastos,
        totalTransacciones
      });
    } catch (e) {
      console.error('Error cargando pedidos detallados en segundo plano:', e);
    }
  }

  async confirmarCierre() {
    const actualCaja = this.caja();
    if (!actualCaja || !this.cajaResumen()) return;

    this.mesasOcupadasError.set(null);
    this.cargandoMesas.set(true);

    try {
      const mesas = await firstValueFrom(this._mesasService.getAll());
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
