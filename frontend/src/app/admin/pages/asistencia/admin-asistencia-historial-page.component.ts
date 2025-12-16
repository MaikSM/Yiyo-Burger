import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { BehaviorSubject, map } from 'rxjs';
import {
  IsEmptyComponent,
  IsErrorComponent,
  IsLoadingComponent,
} from '@shared/components';
import { UsersService } from '@admin/services/users.service';
import { RolesService } from '@admin/services/roles.service';
import { AsistenciaService, Asistencia } from '@admin/services/asistencia.service';
import { iUser } from '@auth/interfaces';
import { iRole } from '@auth/interfaces';
import jsPDF from 'jspdf';
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PieController,
  BarController,
} from 'chart.js';

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PieController,
  BarController
);

@Component({
  selector: 'admin-asistencia-historial-page',
  standalone: true,
  imports: [
    CommonModule,
    IsEmptyComponent,
    IsErrorComponent,
    IsLoadingComponent,
  ],
  templateUrl: './admin-asistencia-historial-page.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAsistenciaHistorialPageComponent implements OnInit, AfterViewInit {
  private _usersService: UsersService = inject(UsersService);
  private _rolesService: RolesService = inject(RolesService);
  private _asistenciaService: AsistenciaService = inject(AsistenciaService);
  private reloadTrigger$ = new BehaviorSubject(0);

  // Filtros
  selectedUserId = signal<number | null>(null);
  selectedYear = signal<number>(new Date().getFullYear());
  selectedMonth = signal<number>(new Date().getMonth() + 1);

  // Vista
  viewMode = signal<'table' | 'charts'>('table');

  // Datos del calendario
  calendarDays = signal<any[]>([]);
  currentMonthName = signal<string>('');

  // Datos de gráficos
  chartData = signal<any>(null);

  // Referencias a los canvas
  @ViewChild('pieChart', { static: false }) pieChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barChart', { static: false }) barChartCanvas!: ElementRef<HTMLCanvasElement>;

  private pieChart: any;
  private barChart: any;

  usersResource = rxResource({
    request: () => this.reloadTrigger$.value,
    loader: () => this._usersService.getAll(),
  });

  rolesResource = rxResource({
    request: () => this.reloadTrigger$.value,
    loader: () => this._rolesService.getAll(),
  });

  asistenciasResource = rxResource({
    request: () => ({
      userId: this.selectedUserId(),
      year: this.selectedYear(),
      month: this.selectedMonth(),
      reload: this.reloadTrigger$.value
    }),
    loader: ({ request }) => {
      if (request.userId) {
        return this._asistenciaService.getByUserAndMonth(request.userId, request.year, request.month);
      }
      return this._asistenciaService.getAll().pipe(
        map(asistencias => asistencias.filter(a =>
          new Date(a.fecha).getFullYear() === request.year &&
          new Date(a.fecha).getMonth() + 1 === request.month
        ))
      );
    },
  });

  ngOnInit() {
    this.generateCalendar();
    this.generateChartData();
  }

  ngAfterViewInit() {
    // Los gráficos se inicializarán cuando se cambie a la vista de gráficos
    if (this.viewMode() === 'charts') {
      setTimeout(() => this.renderCharts(), 100);
    }
  }

  toggleView(mode: 'table' | 'charts') {
    this.viewMode.set(mode);
    if (mode === 'charts') {
      setTimeout(() => this.renderCharts(), 100);
    }
  }

  generateChartData() {
    const asistencias = this.getAsistenciasFiltradas();
    const stats = this.getEstadisticasGenerales();

    // Datos para gráfico de barras (asistencias por día)
    const dailyData = this.getDailyAttendanceData();

    // Datos para gráfico circular (estados de asistencia)
    const statusData = {
      labels: ['Presentes', 'Ausentes', 'Retrasos', 'Salidas Tempranas'],
      datasets: [{
        data: [stats.presentes, stats.ausentes, stats.retrasos, stats.salidasTempranas],
        backgroundColor: [
          '#10B981', // verde
          '#EF4444', // rojo
          '#F59E0B', // amarillo
          '#F97316'  // naranja
        ],
        borderWidth: 1
      }]
    };

    // Datos para gráfico de barras (asistencias diarias)
    const barData = {
      labels: dailyData.map(d => d.day),
      datasets: [{
        label: 'Presentes',
        data: dailyData.map(d => d.presentes),
        backgroundColor: '#10B981',
        borderColor: '#10B981',
        borderWidth: 1
      }, {
        label: 'Ausentes',
        data: dailyData.map(d => d.ausentes),
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
        borderWidth: 1
      }]
    };

    this.chartData.set({
      pie: statusData,
      bar: barData
    });

    // Renderizar gráficos si estamos en vista de gráficos
    if (this.viewMode() === 'charts') {
      setTimeout(() => this.renderCharts(), 100);
    }
  }

  private getDailyAttendanceData() {
    const year = this.selectedYear();
    const month = this.selectedMonth();
    const daysInMonth = new Date(year, month, 0).getDate();

    const dailyData = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayAsistencias = this.asistenciasResource.value()?.filter(a =>
        new Date(a.fecha).toDateString() === date.toDateString()
      ) || [];

      const presentes = dayAsistencias.filter(a => a.estado === 'presente').length;
      const ausentes = dayAsistencias.filter(a => a.estado === 'ausente').length;

      dailyData.push({
        day: day.toString(),
        presentes,
        ausentes
      });
    }

    return dailyData;
  }

  private renderCharts() {
    if (!this.chartData() || !this.pieChartCanvas || !this.barChartCanvas) return;

    const chartData = this.chartData();

    // Destruir gráficos existentes si los hay
    if (this.pieChart) {
      this.pieChart.destroy();
    }
    if (this.barChart) {
      this.barChart.destroy();
    }

    // Crear gráfico circular
    this.pieChart = new Chart(this.pieChartCanvas.nativeElement, {
      type: 'pie',
      data: chartData.pie,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#e5e7eb'
            }
          }
        }
      }
    });

    // Crear gráfico de barras
    this.barChart = new Chart(this.barChartCanvas.nativeElement, {
      type: 'bar',
      data: chartData.bar,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: '#e5e7eb'
            },
            grid: {
              color: '#374151'
            }
          },
          x: {
            ticks: {
              color: '#e5e7eb'
            },
            grid: {
              color: '#374151'
            }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#e5e7eb'
            }
          }
        }
      }
    });
  }

  onUserChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const userId = target.value;
    this.selectedUserId.set(userId ? parseInt(userId) : null);
  }

  onYearChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const year = target.value;
    this.selectedYear.set(parseInt(year));
    this.generateCalendar();
    this.generateChartData();
  }

  onMonthChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const month = target.value;
    this.selectedMonth.set(parseInt(month));
    this.generateCalendar();
    this.generateChartData();
  }

  generateCalendar() {
    const year = this.selectedYear();
    const month = this.selectedMonth() - 1; // JavaScript months are 0-indexed

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const days = [];
    const currentDate = new Date(startDate);

    // Generate 6 weeks (42 days) to fill the calendar
    for (let i = 0; i < 42; i++) {
      const dayData = {
        date: new Date(currentDate),
        dayNumber: currentDate.getDate(),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: this.isToday(currentDate),
        asistencias: [] as Asistencia[]
      };

      // Add asistencias for this day
      if (this.asistenciasResource.value()) {
        dayData.asistencias = this.asistenciasResource.value()!.filter(a =>
          new Date(a.fecha).toDateString() === currentDate.toDateString()
        );
      }

      days.push(dayData);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    this.calendarDays.set(days);
    this.currentMonthName.set(this.getMonthName(month));
  }

  private isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  private getMonthName(monthIndex: number): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[monthIndex];
  }

  getEstadoAsistencia(estado: string): string {
    switch (estado) {
      case 'presente':
        return 'Presente';
      case 'ausente':
        return 'Ausente';
      case 'sin_registro':
        return 'Sin registro';
      case 'ingreso_tarde':
        return 'Ingreso Tarde';
      case 'salida_temprana':
        return 'Salida Temprana';
      default:
        return 'Desconocido';
    }
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'presente':
        return 'bg-green-500';
      case 'ausente':
        return 'bg-red-500';
      case 'sin_registro':
        return 'bg-gray-400';
      case 'ingreso_tarde':
        return 'bg-yellow-500';
      case 'salida_temprana':
        return 'bg-orange-500';
      default:
        return 'bg-gray-400';
    }
  }

  getRolDisplay(rol: string): string {
    switch (rol.toLowerCase()) {
      case 'admin':
        return 'Administrador';
      case 'waiter':
        return 'Mesero';
      case 'user':
        return 'Cliente';
      default:
        return rol;
    }
  }

  getYears(): number[] {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      years.push(i);
    }
    return years;
  }

  getMonths(): { value: number; name: string }[] {
    return [
      { value: 1, name: 'Enero' },
      { value: 2, name: 'Febrero' },
      { value: 3, name: 'Marzo' },
      { value: 4, name: 'Abril' },
      { value: 5, name: 'Mayo' },
      { value: 6, name: 'Junio' },
      { value: 7, name: 'Julio' },
      { value: 8, name: 'Agosto' },
      { value: 9, name: 'Septiembre' },
      { value: 10, name: 'Octubre' },
      { value: 11, name: 'Noviembre' },
      { value: 12, name: 'Diciembre' }
    ];
  }

  getEmpleadosFiltrados(): any[] {
    const users = this.usersResource.value() || [];
    const roles = this.rolesResource.value() || [];

    return users
      .filter((user: any) => {
        const userRole = roles.find((role: any) => role.id === user.role_id);
        return userRole && userRole.name.toLowerCase() !== 'user';
      })
      .map((user: any) => {
        const role = roles.find((r: any) => r.id === user.role_id);
        return {
          ...user,
          rol: role?.name || 'Sin rol'
        };
      });
  }

  getAsistenciasFiltradas(): Asistencia[] {
    if (!this.asistenciasResource.value()) return [];

    if (this.selectedUserId()) {
      return this.asistenciasResource.value()!;
    }

    // Si no hay usuario seleccionado, mostrar todas las asistencias del mes
    return this.asistenciasResource.value()!;
  }

  getEstadisticasGenerales() {
    const asistencias = this.getAsistenciasFiltradas();
    const empleados = this.getEmpleadosFiltrados();

    return {
      totalEmpleados: empleados.length,
      totalAsistencias: asistencias.length,
      presentes: asistencias.filter(a => a.estado === 'presente').length,
      ausentes: asistencias.filter(a => a.estado === 'ausente').length,
      retrasos: asistencias.filter(a => a.estado === 'ingreso_tarde').length,
      salidasTempranas: asistencias.filter(a => a.estado === 'salida_temprana').length,
    };
  }

  generatePDFReport() {
    const doc = new jsPDF();

    // Título
    doc.setFontSize(20);
    doc.text('Reporte de Asistencia', 20, 20);

    // Información del período
    doc.setFontSize(12);
    const monthName = this.getMonthName(this.selectedMonth() - 1);
    doc.text(`Período: ${monthName} ${this.selectedYear()}`, 20, 35);

    // Estadísticas generales
    const stats = this.getEstadisticasGenerales();
    doc.text('Estadísticas Generales:', 20, 50);
    doc.text(`Total Empleados: ${stats.totalEmpleados}`, 20, 60);
    doc.text(`Presentes: ${stats.presentes}`, 20, 70);
    doc.text(`Ausentes: ${stats.ausentes}`, 20, 80);
    doc.text(`Retrasos: ${stats.retrasos}`, 20, 90);
    doc.text(`Salidas Tempranas: ${stats.salidasTempranas}`, 20, 100);
    doc.text(`Total Registros: ${stats.totalAsistencias}`, 20, 110);

    let yPosition = 125;

    // Agregar gráficos si existen
    if (this.pieChartCanvas && this.barChartCanvas) {
      try {
        // Función para agregar fondo negro a la imagen del gráfico
        const addBlackBackground = (canvas: HTMLCanvasElement): string => {
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d')!;

          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;

          // Dibujar fondo negro
          tempCtx.fillStyle = '#000000';
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

          // Dibujar la imagen original encima
          tempCtx.drawImage(canvas, 0, 0);

          return tempCanvas.toDataURL('image/png');
        };

        // Capturar y procesar imagen del gráfico circular
        const pieChartImage = addBlackBackground(this.pieChartCanvas.nativeElement);
        // Capturar y procesar imagen del gráfico de barras
        const barChartImage = addBlackBackground(this.barChartCanvas.nativeElement);

        // Agregar título de gráficos
        doc.text('Gráficos de Asistencia:', 20, yPosition);
        yPosition += 10;

        // Agregar gráfico circular (más pequeño)
        doc.addImage(pieChartImage, 'PNG', 20, yPosition, 80, 60);
        doc.text('Distribución de Estados', 20, yPosition - 5);

        // Agregar gráfico de barras al lado derecho
        doc.addImage(barChartImage, 'PNG', 110, yPosition, 80, 60);
        doc.text('Asistencia por Día', 110, yPosition - 5);

        yPosition += 75;
      } catch (error) {
        console.error('Error al capturar gráficos:', error);
        // Si hay error con los gráficos, continuar sin ellos
        doc.text('Nota: Los gráficos no pudieron ser incluidos en el PDF.', 20, yPosition);
        yPosition += 15;
      }
    }

    // Resumen gráfico
    doc.text('Resumen Gráfico:', 20, yPosition);
    doc.text(`• ${stats.presentes} empleados marcaron presencia`, 30, yPosition + 10);
    doc.text(`• ${stats.ausentes} días de ausencia registrados`, 30, yPosition + 20);
    doc.text(`• ${stats.retrasos} casos de retraso`, 30, yPosition + 30);
    doc.text(`• ${stats.salidasTempranas} salidas tempranas`, 30, yPosition + 40);

    yPosition += 60;

    // Tabla de asistencias
    doc.text('Detalle de Asistencias:', 20, yPosition);
    yPosition += 10;

    // Encabezados de tabla
    doc.setFontSize(10);
    doc.text('Fecha', 20, yPosition);
    doc.text('Empleado', 50, yPosition);
    doc.text('Rol', 100, yPosition);
    doc.text('Entrada', 130, yPosition);
    doc.text('Salida', 160, yPosition);
    doc.text('Estado', 190, yPosition);
    yPosition += 5;

    // Línea separadora
    doc.line(20, yPosition, 200, yPosition);
    yPosition += 10;

    // Datos de la tabla
    const asistencias = this.getAsistenciasFiltradas();
    asistencias.forEach((asistencia, index) => {
      if (yPosition > 270) { // Nueva página si es necesario
        doc.addPage();
        yPosition = 20;
      }

      const fecha = new Date(asistencia.fecha).toLocaleDateString('es-ES');
      const empleado = `${asistencia.user?.name || ''} ${asistencia.user?.surname || ''}`.trim();
      const rol = this.getRolDisplay(asistencia.user?.role?.name || 'Sin rol');
      const entrada = asistencia.hora_entrada || '-';
      const salida = asistencia.hora_salida || '-';
      const estado = this.getEstadoAsistencia(asistencia.estado);

      doc.text(fecha, 20, yPosition);
      doc.text(empleado.substring(0, 20), 50, yPosition); // Limitar longitud
      doc.text(rol.substring(0, 15), 100, yPosition);
      doc.text(entrada, 130, yPosition);
      doc.text(salida, 160, yPosition);
      doc.text(estado, 190, yPosition);

      yPosition += 8;
    });

    // Pie de página
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Página ${i} de ${pageCount}`, 180, 290);
    }

    // Descargar el PDF
    const fileName = `reporte_asistencia_${monthName}_${this.selectedYear()}.pdf`;
    doc.save(fileName);
  }

  goBack() {
    // Navegar de vuelta a la página principal de asistencia
    window.history.back();
  }
}