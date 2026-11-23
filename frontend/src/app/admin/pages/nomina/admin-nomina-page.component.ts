import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersService } from '@admin/services/users.service';
import { NominaService, PagoNomina } from '@admin/services/nomina.service';
import { iUser } from '@auth/interfaces';
import { toast } from 'ngx-sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface CalendarDay {
  date: Date;
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  asistencias: { user_id: number; nombre: string; hora_entrada?: string }[];
  pagos: PagoNomina[];
}

export interface DiaTrabajadoDetalle {
  fecha: string;
  hora_entrada?: string;
  pagado: boolean;
  pagoId?: string;
  fechaPago?: string;
}

export interface EmpleadoNominaResumen {
  user: iUser;
  userId: number;
  nombre: string;
  rol: string;
  tarifaDiaria: number;
  diasTrabajados: DiaTrabajadoDetalle[];
  totalTrabajados: number;
  totalPagados: number;
  totalPendientes: number;
  montoPagadoDias: number;
  montoAdelantos: number;
  montoBonos: number;
  totalDesembolsado: number;
  saldoEstimado: number;
  movimientos: PagoNomina[];
}

@Component({
  selector: 'admin-nomina-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-nomina-page.component.html',
  styleUrls: ['./admin-nomina-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminNominaPageComponent implements OnInit {
  private _usersService = inject(UsersService);
  private _nominaService = inject(NominaService);

  // Vista activa: 'empleados' (estado de cuenta por trabajador) o 'calendario' (asistencia general)
  activeView = signal<'empleados' | 'calendario'>('empleados');
  periodFilter = signal<'mes' | 'q1' | 'q2' | 'todos'>('mes');
  selectedEmpleadoId = signal<number | null>(null);
  selectedDiasParaPagar = signal<string[]>([]);
  tarifaEditInput = signal<number | string>('');
  savingTarifa = signal<boolean>(false);

  // Fecha actual seleccionada
  currentYear = signal<number>(new Date().getFullYear());
  currentMonth = signal<number>(new Date().getMonth());

  // Filtro de empleado en calendario ('ALL' o ID numérico)
  selectedEmployeeFilter = signal<string>('ALL');

  // Datos
  users = signal<iUser[]>([]);
  pagosList = signal<PagoNomina[]>([]);
  asistenciasMap = signal<Record<string, { user_id: number; nombre: string; hora_entrada?: string }[]>>({});

  // Modales
  showPagoModal = signal<boolean>(false);
  showAsistenciaModal = signal<boolean>(false);
  showDayDetailModal = signal<boolean>(false);
  selectedDayDetail = signal<CalendarDay | null>(null);

  // Formulario Pago / Adelanto / Bono
  pagoTipo = signal<'pago' | 'adelanto' | 'bono'>('pago');
  pagoFecha = signal<string>('');
  pagoUserId = signal<number | null>(null);
  pagoDias = signal<number>(1);
  pagoFechasSeleccionadas = signal<string[]>([]);
  pagoMonto = signal<number | string>('');
  pagoMetodo = signal<string>('Efectivo');
  pagoObs = signal<string>('');
  pagoRegistrarEgreso = signal<boolean>(true);

  // Formulario Asistencia
  asistenciaFecha = signal<string>('');
  selectedUserIds = signal<number[]>([]);

  monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  weekDays = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];

  ngOnInit(): void {
    this.loadUsers();
    this.loadData();
  }

  loadUsers(): void {
    this._usersService.getAll().subscribe({
      next: (usersList) => {
        const staff = (usersList || []).filter(u => {
          const rName = (u.role?.name || (u as any).UserEntity_role?.name || '').toLowerCase();
          return rName !== 'user' && rName !== 'cliente';
        });
        this.users.set(staff.length > 0 ? staff : usersList);
      },
      error: (err) => console.error('Error cargando usuarios:', err)
    });
  }

  loadData(): void {
    this._nominaService.getPagos().subscribe({
      next: (pagos) => this.pagosList.set(pagos || []),
      error: (err) => console.error('Error cargando pagos de nómina:', err)
    });
    this._nominaService.getAsistenciasMap().subscribe({
      next: (map) => this.asistenciasMap.set(map || {}),
      error: (err) => console.error('Error cargando asistencias:', err)
    });
  }

  currentMonthName = computed(() => this.monthNames[this.currentMonth()]);

  private matchesPeriod(dateStr: string): boolean {
    const period = this.periodFilter();
    if (period === 'todos') return true;
    const prefix = `${this.currentYear()}-${String(this.currentMonth() + 1).padStart(2, '0')}`;
    if (!dateStr || !dateStr.startsWith(prefix)) return false;
    if (period === 'mes') return true;
    const day = Number(dateStr.split('-')[2] || 0);
    if (period === 'q1') return day >= 1 && day <= 15;
    if (period === 'q2') return day >= 16;
    return true;
  }

  // Resumen completo por empleado (días trabajados, pagados, pendientes, adelantos, saldo)
  empleadosResumen = computed<EmpleadoNominaResumen[]>(() => {
    const staff = this.users();
    const map = this.asistenciasMap();
    const allPagos = this.pagosList();

    return staff
      .filter((u): u is iUser & { id: number } => typeof u.id === 'number')
      .map((u) => {
        const userId = u.id;
        const nombre = `${u.name || ''} ${u.surname || ''}`.trim() || `Empleado #${userId}`;
        const rol = u.role?.name || (u as any).UserEntity_role?.name || 'Personal';
        const tarifaDiaria = Number((u as any).tarifa_diaria) || 0;

        // Movimientos del empleado en el período
        const movimientos = allPagos
          .filter((p) => Number(p.user_id) === userId && this.matchesPeriod(p.fecha))
          .sort((a, b) => (b.fecha > a.fecha ? 1 : -1));

        // Mapa de fechas explícitamente pagadas (de todos los pagos del empleado)
        const paidDateMap = new Map<string, PagoNomina>();
        let legacyPaidDaysCount = 0;

        for (const p of allPagos.filter((x) => Number(x.user_id) === userId)) {
          const tipo = p.tipo || 'pago';
          if (tipo !== 'pago') continue;
          let fechas: string[] = [];
          if (Array.isArray(p.fechas_pagadas)) {
            fechas = p.fechas_pagadas;
          } else if (typeof p.fechas_pagadas === 'string') {
            try {
              const parsed = JSON.parse(p.fechas_pagadas);
              if (Array.isArray(parsed)) fechas = parsed;
            } catch {}
          }
          if (fechas.length > 0) {
            fechas.forEach((f) => paidDateMap.set(f, p));
          } else if (this.matchesPeriod(p.fecha)) {
            legacyPaidDaysCount += Number(p.dias_pagados) || 0;
          }
        }

        // Recopilar días trabajados del empleado en el período
        const workedRaw: { fecha: string; hora_entrada?: string }[] = [];
        for (const [fecha, list] of Object.entries(map)) {
          if (!this.matchesPeriod(fecha)) continue;
          const found = (list || []).find((a) => Number(a.user_id) === userId);
          if (found) {
            workedRaw.push({ fecha, hora_entrada: found.hora_entrada });
          }
        }
        workedRaw.sort((a, b) => (a.fecha > b.fecha ? 1 : -1));

        // Marcar cuáles días están pagados (primero los explícitos, luego cubrir con pagos antiguos FIFO)
        let remainingLegacy = legacyPaidDaysCount;
        const diasTrabajados: DiaTrabajadoDetalle[] = workedRaw.map((w) => {
          const explicitPago = paidDateMap.get(w.fecha);
          if (explicitPago) {
            return {
              fecha: w.fecha,
              hora_entrada: w.hora_entrada,
              pagado: true,
              pagoId: explicitPago.id,
              fechaPago: explicitPago.fecha,
            };
          }
          if (remainingLegacy > 0) {
            remainingLegacy--;
            return {
              fecha: w.fecha,
              hora_entrada: w.hora_entrada,
              pagado: true,
            };
          }
          return {
            fecha: w.fecha,
            hora_entrada: w.hora_entrada,
            pagado: false,
          };
        });

        const totalTrabajados = diasTrabajados.length;
        const totalPagados = diasTrabajados.filter((d) => d.pagado).length;
        const totalPendientes = Math.max(0, totalTrabajados - totalPagados);

        const montoPagadoDias = movimientos
          .filter((m) => (m.tipo || 'pago') === 'pago')
          .reduce((s, m) => s + (Number(m.monto) || 0), 0);
        const montoAdelantos = movimientos
          .filter((m) => m.tipo === 'adelanto')
          .reduce((s, m) => s + (Number(m.monto) || 0), 0);
        const montoBonos = movimientos
          .filter((m) => m.tipo === 'bono')
          .reduce((s, m) => s + (Number(m.monto) || 0), 0);
        const totalDesembolsado = montoPagadoDias + montoAdelantos + montoBonos;

        const saldoBrutoPendiente = totalPendientes * tarifaDiaria;
        const saldoEstimado = Math.max(0, saldoBrutoPendiente - montoAdelantos);

        return {
          user: u,
          userId,
          nombre,
          rol,
          tarifaDiaria,
          diasTrabajados,
          totalTrabajados,
          totalPagados,
          totalPendientes,
          montoPagadoDias,
          montoAdelantos,
          montoBonos,
          totalDesembolsado,
          saldoEstimado,
          movimientos,
        };
      })
      .sort((a, b) => b.totalPendientes - a.totalPendientes || b.totalTrabajados - a.totalTrabajados);
  });

  selectedEmpleadoDetalle = computed<EmpleadoNominaResumen | null>(() => {
    const id = this.selectedEmpleadoId();
    if (!id) return null;
    return this.empleadosResumen().find((e) => e.userId === id) || null;
  });

  resumenGlobalEmpleados = computed(() => {
    const list = this.empleadosResumen();
    return {
      totalTrabajados: list.reduce((s, e) => s + e.totalTrabajados, 0),
      totalPagados: list.reduce((s, e) => s + e.totalPagados, 0),
      totalPendientes: list.reduce((s, e) => s + e.totalPendientes, 0),
      totalDesembolsado: list.reduce((s, e) => s + e.totalDesembolsado, 0),
      saldoPendienteTotal: list.reduce((s, e) => s + e.saldoEstimado, 0),
    };
  });

  abrirFichaEmpleado(emp: EmpleadoNominaResumen): void {
    this.selectedEmpleadoId.set(emp.userId);
    this.tarifaEditInput.set(emp.tarifaDiaria || '');
    this.selectedDiasParaPagar.set(emp.diasTrabajados.filter((d) => !d.pagado).map((d) => d.fecha));
  }

  cerrarFichaEmpleado(): void {
    this.selectedEmpleadoId.set(null);
    this.selectedDiasParaPagar.set([]);
  }

  guardarTarifaEmpleado(emp: EmpleadoNominaResumen): void {
    const nuevaTarifa = Number(this.tarifaEditInput());
    if (isNaN(nuevaTarifa) || nuevaTarifa < 0) {
      toast.error('Ingresa una tarifa diaria válida');
      return;
    }
    this.savingTarifa.set(true);
    this._nominaService.updateTarifaEmpleado(emp.userId, nuevaTarifa).subscribe({
      next: () => {
        this.savingTarifa.set(false);
        this.users.update((list) =>
          list.map((u) => (u.id === emp.userId ? ({ ...u, tarifa_diaria: nuevaTarifa } as any) : u))
        );
        toast.success(`Tarifa diaria de ${emp.nombre} actualizada a $${nuevaTarifa.toLocaleString('es-CO')}`);
      },
      error: (err) => {
        this.savingTarifa.set(false);
        toast.error(err?.error?.message || 'Error al guardar tarifa diaria');
      },
    });
  }

  toggleDiaSeleccionadoParaPagar(fecha: string): void {
    const current = new Set(this.selectedDiasParaPagar());
    if (current.has(fecha)) current.delete(fecha);
    else current.add(fecha);
    this.selectedDiasParaPagar.set(Array.from(current).sort());
  }

  isDiaSeleccionado(fecha: string): boolean {
    return this.selectedDiasParaPagar().includes(fecha);
  }

  seleccionarTodosPendientes(emp: EmpleadoNominaResumen): void {
    this.selectedDiasParaPagar.set(emp.diasTrabajados.filter((d) => !d.pagado).map((d) => d.fecha));
  }

  limpiarDiasSeleccionados(): void {
    this.selectedDiasParaPagar.set([]);
  }

  abrirPagoDesdeEmpleado(emp: EmpleadoNominaResumen, tipo: 'pago' | 'adelanto' | 'bono' = 'pago', fechasExplicitas?: string[]): void {
    const fechas = tipo === 'pago'
      ? (fechasExplicitas && fechasExplicitas.length > 0
          ? fechasExplicitas
          : emp.diasTrabajados.filter((d) => !d.pagado).map((d) => d.fecha))
      : [];
    const dias = tipo === 'pago' ? Math.max(1, fechas.length || emp.totalPendientes || 1) : 0;
    const montoSugerido =
      tipo === 'pago' && emp.tarifaDiaria > 0
        ? Math.max(0, dias * emp.tarifaDiaria - (fechas.length === emp.totalPendientes ? emp.montoAdelantos : 0))
        : '';

    this.pagoTipo.set(tipo);
    this.pagoFecha.set(this.formatDateStr(new Date()));
    this.pagoUserId.set(emp.userId);
    this.pagoDias.set(dias);
    this.pagoFechasSeleccionadas.set(fechas);
    this.pagoMonto.set(montoSugerido);
    this.pagoMetodo.set('Efectivo');
    this.pagoObs.set(
      tipo === 'pago' && fechas.length > 0
        ? `Días liquidados: ${fechas.join(', ')}`
        : ''
    );
    this.pagoRegistrarEgreso.set(true);
    this.showPagoModal.set(true);
  }

  onPagoUserOrDaysChange(): void {
    if (this.pagoTipo() !== 'pago') return;
    const uid = Number(this.pagoUserId());
    const emp = this.empleadosResumen().find((e) => e.userId === uid);
    if (emp && emp.tarifaDiaria > 0) {
      const dias = Math.max(1, Number(this.pagoDias()) || 1);
      this.pagoMonto.set(dias * emp.tarifaDiaria);
    }
  }

  exportarReciboEmpleadoPDF(emp: EmpleadoNominaResumen, pago?: PagoNomina): void {
    const doc = new jsPDF();
    doc.setFillColor(234, 88, 12);
    doc.rect(0, 0, 210, 26, 'F');
    doc.setFontSize(17);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('YIYO BURGER - COMPROBANTE DE NÓMINA', 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Empleado: ${emp.nombre} (${emp.rol})`, 14, 23);

    if (pago) {
      const tipoLabel = pago.tipo === 'adelanto' ? 'Adelanto / Préstamo' : pago.tipo === 'bono' ? 'Bono / Extra' : 'Pago de Días Trabajados';
      autoTable(doc, {
        startY: 34,
        head: [['Campo', 'Detalle']],
        body: [
          ['Tipo de Movimiento', tipoLabel],
          ['Fecha de Pago', pago.fecha],
          ['Días Pagados', String(pago.dias_pagados || 0)],
          ['Fechas Cubiertas', Array.isArray(pago.fechas_pagadas) && pago.fechas_pagadas.length > 0 ? pago.fechas_pagadas.join(', ') : 'No especificadas'],
          ['Método de Pago', pago.metodo_pago || 'Efectivo'],
          ['Monto Entregado', `$${Number(pago.monto || 0).toLocaleString('es-CO')}`],
          ['Observaciones', pago.observaciones || '-'],
        ],
        headStyles: { fillColor: [31, 41, 55] },
      });
      doc.save(`Recibo_Nomina_${emp.nombre.replace(/\s+/g, '_')}_${pago.fecha}.pdf`);
    } else {
      autoTable(doc, {
        startY: 34,
        head: [['Resumen del Período', 'Valor']],
        body: [
          ['Tarifa Diaria', `$${emp.tarifaDiaria.toLocaleString('es-CO')}`],
          ['Días Trabajados', String(emp.totalTrabajados)],
          ['Días Pagados', String(emp.totalPagados)],
          ['Días Pendientes', String(emp.totalPendientes)],
          ['Total Pagado en Días', `$${emp.montoPagadoDias.toLocaleString('es-CO')}`],
          ['Adelantos', `$${emp.montoAdelantos.toLocaleString('es-CO')}`],
          ['Bonos', `$${emp.montoBonos.toLocaleString('es-CO')}`],
          ['Saldo Estimado Pendiente', `$${emp.saldoEstimado.toLocaleString('es-CO')}`],
        ],
        headStyles: { fillColor: [31, 41, 55] },
      });

      if (emp.diasTrabajados.length > 0) {
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 10,
          head: [['Fecha Trabajada', 'Hora Entrada', 'Estado']],
          body: emp.diasTrabajados.map((d) => [d.fecha, d.hora_entrada || '08:00', d.pagado ? 'PAGADO' : 'PENDIENTE']),
          headStyles: { fillColor: [234, 88, 12] },
        });
      }
      doc.save(`Estado_Cuenta_${emp.nombre.replace(/\s+/g, '_')}_${this.currentYear()}-${this.currentMonth() + 1}.pdf`);
    }
  }

  // --- CALENDARIO GENERAL (Mantenido intacto) ---
  calendarDays = computed<CalendarDay[]>(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    const filter = this.selectedEmployeeFilter();
    const todayStr = this.formatDateStr(new Date());

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const totalDaysInMonth = lastDayOfMonth.getDate();
    const days: CalendarDay[] = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = this.formatDateStr(prevDate);
      days.push({
        date: prevDate,
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        asistencias: [],
        pagos: []
      });
    }

    const allPagos = this.pagosList();
    const allAsistencias = this.asistenciasMap();

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = this.formatDateStr(dateObj);

      let dayAsistencias = allAsistencias[dateStr] || [];
      if (filter !== 'ALL') {
        const targetId = Number(filter);
        dayAsistencias = dayAsistencias.filter(a => a.user_id === targetId);
      }

      let dayPagos = allPagos.filter(p => p.fecha === dateStr);
      if (filter !== 'ALL') {
        const targetId = Number(filter);
        dayPagos = dayPagos.filter(p => p.user_id === targetId);
      }

      days.push({
        date: dateObj,
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        asistencias: dayAsistencias,
        pagos: dayPagos
      });
    }

    const remainingCells = 42 - days.length;
    if (remainingCells < 7) {
      for (let i = 1; i <= remainingCells; i++) {
        const nextDate = new Date(year, month + 1, i);
        const dateStr = this.formatDateStr(nextDate);
        days.push({
          date: nextDate,
          dateStr,
          dayNumber: i,
          isCurrentMonth: false,
          isToday: dateStr === todayStr,
          asistencias: [],
          pagos: []
        });
      }
    }

    return days;
  });

  monthlyStats = computed(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    const filter = this.selectedEmployeeFilter();
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    let pagosMes = this.pagosList().filter(p => p.fecha.startsWith(prefix));
    if (filter !== 'ALL') {
      const targetId = Number(filter);
      pagosMes = pagosMes.filter(p => p.user_id === targetId);
    }

    const totalMontoPagado = pagosMes.reduce((sum, p) => sum + Number(p.monto || 0), 0);
    const totalDiasPagados = pagosMes.reduce((sum, p) => sum + Number(p.dias_pagados || 0), 0);

    const map = this.asistenciasMap();
    let totalAsistencias = 0;
    Object.keys(map).forEach(dateKey => {
      if (dateKey.startsWith(prefix)) {
        let list = map[dateKey] || [];
        if (filter !== 'ALL') {
          const targetId = Number(filter);
          list = list.filter(a => a.user_id === targetId);
        }
        totalAsistencias += list.length;
      }
    });

    return {
      totalMontoPagado,
      totalDiasPagados,
      totalAsistencias,
      totalRegistrosPago: pagosMes.length
    };
  });

  prevMonth(): void {
    if (this.currentMonth() === 0) {
      this.currentMonth.set(11);
      this.currentYear.update(y => y - 1);
    } else {
      this.currentMonth.update(m => m - 1);
    }
  }

  nextMonth(): void {
    if (this.currentMonth() === 11) {
      this.currentMonth.set(0);
      this.currentYear.update(y => y + 1);
    } else {
      this.currentMonth.update(m => m + 1);
    }
  }

  goToToday(): void {
    const today = new Date();
    this.currentYear.set(today.getFullYear());
    this.currentMonth.set(today.getMonth());
  }

  onYearMonthChange(): void {}

  openPagoModal(dateStr?: string): void {
    const dateToUse = dateStr || this.formatDateStr(new Date());
    this.pagoTipo.set('pago');
    this.pagoFecha.set(dateToUse);
    const firstUser = this.users()[0];
    this.pagoUserId.set(firstUser?.id ?? null);
    this.pagoDias.set(1);
    this.pagoFechasSeleccionadas.set([]);
    this.pagoMonto.set((firstUser as any)?.tarifa_diaria > 0 ? Number((firstUser as any).tarifa_diaria) : '');
    this.pagoMetodo.set('Efectivo');
    this.pagoObs.set('');
    this.pagoRegistrarEgreso.set(true);
    this.showPagoModal.set(true);
  }

  closePagoModal(): void {
    this.showPagoModal.set(false);
  }

  savePago(): void {
    const userId = Number(this.pagoUserId());
    const fecha = this.pagoFecha();
    const monto = Number(this.pagoMonto());
    const tipo = this.pagoTipo();
    const fechasSel = tipo === 'pago' ? this.pagoFechasSeleccionadas() : [];
    const dias = tipo === 'pago' ? (fechasSel.length > 0 ? fechasSel.length : Number(this.pagoDias())) : 0;

    if (!userId || !fecha || isNaN(monto) || monto <= 0 || (tipo === 'pago' && (isNaN(dias) || dias <= 0))) {
      toast.error('Campos incompletos', {
        description: 'Por favor selecciona un trabajador, una fecha y un monto válido.'
      });
      return;
    }

    const u = this.users().find(user => user.id === userId);
    const nombre = u ? `${u.name} ${u.surname || ''}`.trim() : 'Trabajador';

    this._nominaService.savePago({
      user_id: userId,
      empleado_nombre: nombre.toUpperCase(),
      fecha: fecha,
      dias_pagados: dias,
      tipo,
      fechas_pagadas: fechasSel.length > 0 ? fechasSel : undefined,
      monto: monto,
      metodo_pago: this.pagoMetodo(),
      observaciones: this.pagoObs()
    }, this.pagoRegistrarEgreso()).subscribe({
      next: () => {
        this.loadData();
        this.selectedDiasParaPagar.set([]);
        this.closePagoModal();
        const label = tipo === 'adelanto' ? 'Adelanto registrado' : tipo === 'bono' ? 'Bono registrado' : 'Pago de nómina registrado';
        toast.success(label, {
          description: `$${monto.toLocaleString('es-CO')} para ${nombre}${tipo === 'pago' ? ` (${dias} días)` : ''}.`
        });
      },
      error: (err) => {
        toast.error('Error guardando pago de nómina');
        console.error(err);
      }
    });
  }

  openAsistenciaModal(dateStr?: string): void {
    const dateToUse = dateStr || this.formatDateStr(new Date());
    this.asistenciaFecha.set(dateToUse);

    const map = this.asistenciasMap();
    const asistenciasFecha = map[dateToUse] || [];
    const idsPresentes = asistenciasFecha.map(a => a.user_id);
    this.selectedUserIds.set(idsPresentes);

    this.showAsistenciaModal.set(true);
  }

  closeAsistenciaModal(): void {
    this.showAsistenciaModal.set(false);
  }

  isUserSelected(userId: number | undefined): boolean {
    if (userId === undefined) return false;
    return this.selectedUserIds().includes(userId);
  }

  toggleUserAsistencia(userId: number | undefined): void {
    if (userId === undefined) return;
    const current = new Set(this.selectedUserIds());
    if (current.has(userId)) current.delete(userId);
    else current.add(userId);
    this.selectedUserIds.set(Array.from(current));
  }

  selectAllUsersAsistencia(): void {
    const allIds = this.users().map(u => u.id).filter((id): id is number => id !== undefined);
    this.selectedUserIds.set(allIds);
  }

  clearAllUsersAsistencia(): void {
    this.selectedUserIds.set([]);
  }

  saveAsistencia(): void {
    const fecha = this.asistenciaFecha();
    if (!fecha) return;

    const selectedIds = this.selectedUserIds();
    const listaPresentes = selectedIds.map(id => {
      const u = this.users().find(user => user.id === id);
      const nombre = u ? `${u.name} ${u.surname || ''}`.trim().toUpperCase() : `ID:${id}`;
      return {
        user_id: id,
        nombre: nombre,
        hora_entrada: '08:00'
      };
    });

    this._nominaService.saveAsistenciasDia(fecha, listaPresentes).subscribe({
      next: () => {
        this.loadData();
        this.closeAsistenciaModal();
        toast.success('Asistencia actualizada', {
          description: `Se registraron ${listaPresentes.length} trabajadores presentes para el ${fecha}.`
        });
      },
      error: (err) => {
        toast.error('Error guardando asistencias');
        console.error(err);
      }
    });
  }

  openDayDetail(day: CalendarDay): void {
    if (!day.isCurrentMonth) return;
    this.selectedDayDetail.set(day);
    this.showDayDetailModal.set(true);
  }

  closeDayDetailModal(): void {
    this.showDayDetailModal.set(false);
    this.selectedDayDetail.set(null);
  }

  deletePago(pagoId: string): void {
    if (confirm('¿Está seguro de eliminar este registro de pago de nómina?')) {
      this._nominaService.deletePago(pagoId).subscribe({
        next: () => {
          this.loadData();
          if (this.selectedDayDetail()) {
            const updatedDay = {
              ...this.selectedDayDetail()!,
              pagos: this.selectedDayDetail()!.pagos.filter(p => p.id !== pagoId)
            };
            this.selectedDayDetail.set(updatedDay);
          }
          toast.success('Pago eliminado');
        },
        error: (err) => {
          toast.error('Error al eliminar pago');
          console.error(err);
        }
      });
    }
  }

  formatFechaCorta(fechaStr: string): string {
    if (!fechaStr) return '';
    const [y, m, d] = fechaStr.split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
    return dt.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' });
  }

  private formatDateStr(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export default AdminNominaPageComponent;
