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

export interface CalendarDay {
  date: Date;
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  asistencias: { user_id: number; nombre: string; hora_entrada?: string }[];
  pagos: PagoNomina[];
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

  // Fecha actual seleccionada para la vista del calendario
  currentYear = signal<number>(new Date().getFullYear());
  currentMonth = signal<number>(new Date().getMonth()); // 0-indexed (0 = Enero, 7 = Agosto, etc.)

  // Filtro de empleado ('ALL' o ID numérico)
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

  // Formulario Pago
  pagoFecha = signal<string>('');
  pagoUserId = signal<number | null>(null);
  pagoDias = signal<number>(1);
  pagoMonto = signal<number | string>('');
  pagoMetodo = signal<string>('Efectivo');
  pagoObs = signal<string>('');
  pagoRegistrarEgreso = signal<boolean>(true);

  // Formulario Asistencia
  asistenciaFecha = signal<string>('');
  selectedUserIds = signal<number[]>([]);

  // Nombres de meses en español
  monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Días de la semana (Empezando en Lunes como la imagen de Excel)
  weekDays = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];

  ngOnInit(): void {
    this.loadUsers();
    this.loadData();
  }

  loadUsers(): void {
    this._usersService.getAll().subscribe({
      next: (usersList) => {
        // Filtrar solo trabajadores / empleados (excluir clientes si tienen rol 'user')
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

  // Nombres formateados del mes actual
  currentMonthName = computed(() => this.monthNames[this.currentMonth()]);

  // Generador de días del calendario (Matriz de 7 columnas: Lunes a Domingo)
  calendarDays = computed<CalendarDay[]>(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    const filter = this.selectedEmployeeFilter();

    const todayStr = new Date().toISOString().split('T')[0];

    // Primer día del mes
    const firstDayOfMonth = new Date(year, month, 1);
    // Último día del mes
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Ajustar offset para que el Lunes sea índice 0 (JavaScript Date.getDay() retorna 0 para Domingo)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Domingo pasa a ser 6

    const totalDaysInMonth = lastDayOfMonth.getDate();
    const days: CalendarDay[] = [];

    // Días de relleno del mes anterior
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

    // Días del mes actual
    const allPagos = this.pagosList();
    const allAsistencias = this.asistenciasMap();

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = this.formatDateStr(dateObj);

      // Asistencias para esta fecha
      let dayAsistencias = allAsistencias[dateStr] || [];
      if (filter !== 'ALL') {
        const targetId = Number(filter);
        dayAsistencias = dayAsistencias.filter(a => a.user_id === targetId);
      }

      // Pagos de nómina para esta fecha
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

    // Días de relleno del mes siguiente para completar la cuadrícula de 7x(5 o 6)
    const remainingCells = 42 - days.length; // 6 filas completas x 7 columnas
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

  // Estadísticas del mes actual
  monthlyStats = computed(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    const filter = this.selectedEmployeeFilter();

    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    // Filtrar pagos del mes
    let pagosMes = this.pagosList().filter(p => p.fecha.startsWith(prefix));
    if (filter !== 'ALL') {
      const targetId = Number(filter);
      pagosMes = pagosMes.filter(p => p.user_id === targetId);
    }

    const totalMontoPagado = pagosMes.reduce((sum, p) => sum + Number(p.monto || 0), 0);
    const totalDiasPagados = pagosMes.reduce((sum, p) => sum + Number(p.dias_pagados || 0), 0);

    // Contar asistencias del mes
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

  // Navegación de mes
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

  onYearMonthChange(): void {
    // Método activado si el usuario selecciona desde el selector
  }

  // Modales
  openPagoModal(dateStr?: string): void {
    const dateToUse = dateStr || new Date().toISOString().split('T')[0];
    this.pagoFecha.set(dateToUse);
    const firstUser = this.users()[0];
    this.pagoUserId.set(firstUser?.id ?? null);
    this.pagoDias.set(1);
    this.pagoMonto.set('');
    this.pagoMetodo.set('Efectivo');
    this.pagoObs.set('');
    this.pagoRegistrarEgreso.set(true);
    this.showPagoModal.set(true);
  }

  closePagoModal(): void {
    this.showPagoModal.set(false);
  }

  savePago(): void {
    const userId = this.pagoUserId();
    const fecha = this.pagoFecha();
    const monto = Number(this.pagoMonto());
    const dias = Number(this.pagoDias());

    if (!userId || !fecha || isNaN(monto) || monto <= 0 || isNaN(dias) || dias <= 0) {
      toast.error('Campos incompletos', {
        description: 'Por favor selecciona un trabajador, una fecha, el número de días y un monto válido.'
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
      monto: monto,
      metodo_pago: this.pagoMetodo(),
      observaciones: this.pagoObs()
    }, this.pagoRegistrarEgreso()).subscribe({
      next: () => {
        this.loadData();
        this.closePagoModal();
        toast.success('Pago de nómina registrado', {
          description: `Se registró el pago de $${monto.toLocaleString()} para ${nombre} (${dias} días).`
        });
      },
      error: (err) => {
        toast.error('Error guardando pago de nómina');
        console.error(err);
      }
    });
  }

  openAsistenciaModal(dateStr?: string): void {
    const dateToUse = dateStr || new Date().toISOString().split('T')[0];
    this.asistenciaFecha.set(dateToUse);
    
    // Cargar seleccionados existentes para esta fecha
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
    if (current.has(userId)) {
      current.delete(userId);
    } else {
      current.add(userId);
    }
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

  private formatDateStr(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export default AdminNominaPageComponent;
