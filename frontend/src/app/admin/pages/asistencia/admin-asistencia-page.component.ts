import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  signal,
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
import { toast } from 'ngx-sonner';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'admin-asistencia-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IsEmptyComponent,
    IsErrorComponent,
    IsLoadingComponent,
  ],
  templateUrl: './admin-asistencia-page.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAsistenciaPageComponent implements OnInit {
  private _usersService: UsersService = inject(UsersService);
  private _rolesService: RolesService = inject(RolesService);
  private _asistenciaService: AsistenciaService = inject(AsistenciaService);
  private _cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private reloadTrigger$ = new BehaviorSubject(0);

  // Estado de asistencia desde la API
  asistenciaData = signal<Asistencia[]>([]);

  // Horarios del restaurante (editables)
  horaEntradaRestaurante = signal<string>('08:00');
  horaSalidaRestaurante = signal<string>('18:00');

  // Horarios globales para configuración
  horaEntradaGlobal = signal<string>('08:00');
  horaSalidaGlobal = signal<string>('18:00');

  // Fecha seleccionada para las asistencias
  fechaSeleccionada = signal<string>(new Date().toISOString().split('T')[0]);

  // Estado del modal de historial
  showHistorialModal = signal<boolean>(false);
  historialLoading = signal<boolean>(false);
  historialData = signal<any[]>([]);

  // Estado del escáner QR
  showScannerModal = signal<boolean>(false);
  scannerType = signal<'entrada' | 'salida'>('entrada');
  scannerEnabled = signal<boolean>(true);
  stream: MediaStream | null = null;

  usersResource = rxResource({
    request: () => this.reloadTrigger$.value,
    loader: () => this._usersService.getAll(),
  });

  rolesResource = rxResource({
    request: () => this.reloadTrigger$.value,
    loader: () => this._rolesService.getAll(),
  });

  ngOnInit() {
    // Los datos se cargan automáticamente a través de rxResource
    // Cargar datos de asistencia desde la API
    this.loadAsistenciaData();
  }

  private async loadAsistenciaData() {
    try {
      const asistencias = await this._asistenciaService.getAll().toPromise();
      this.asistenciaData.set(asistencias || []);
    } catch (error) {
      console.error('Error loading asistencia data:', error);
      this.asistenciaData.set([]);
    }
  }

  getEmpleadosConAsistencia(): any[] {
    const users = this.usersResource.value() || [];
    const roles = this.rolesResource.value() || [];

    console.log('Users:', users);
    console.log('Roles:', roles);

    // Filtrar usuarios que NO tengan rol 'user' (clientes) - solo mostrar empleados
    const empleados = users.filter((user: any) => {
      // El rol ya viene incluido en el usuario desde la API (JOIN)
      const rolNombre = user.role?.name || user.UserEntity_role?.name || '';
      const isUserRole = rolNombre.toLowerCase() === 'user';

      console.log('User:', user.name, user.surname, 'Role:', rolNombre, 'Is User Role:', isUserRole, 'Filtered Out:', isUserRole);

      // Solo incluir si NO es rol 'user'
      return !isUserRole;
    });

    console.log('Filtered empleados (staff only):', empleados);

    // Combinar con datos de asistencia
    return empleados.map((empleado: any) => {
      const asistencia = this.asistenciaData().find((a: any) => a.user_id === empleado.id && a.fecha === this.fechaSeleccionada());

      // El rol ya viene incluido en el usuario desde la API (JOIN)
      const rolNombre = empleado.role?.name || empleado.UserEntity_role?.name || 'Sin rol';

      console.log('Empleado:', empleado.name, 'Rol:', rolNombre, 'Role object:', empleado.role, 'UserEntity_role:', empleado.UserEntity_role);

      return {
        ...empleado,
        rol: rolNombre,
        asistencia: asistencia || {
          hora_entrada: null,
          hora_salida: null,
          estado: 'sin_registro',
          fecha: this.fechaSeleccionada()
        }
      };
    });
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
        return 'bg-green-600';
      case 'ausente':
        return 'bg-red-600';
      case 'sin_registro':
        return 'bg-gray-600';
      case 'ingreso_tarde':
        return 'bg-yellow-600';
      case 'salida_temprana':
        return 'bg-orange-600';
      default:
        return 'bg-gray-600';
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

  getCurrentDate(): string {
    return new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getEmpleadosPresentes(): number {
    return this.getEmpleadosConAsistencia().filter((emp: any) =>
      emp.asistencia.estado === 'presente'
    ).length;
  }

  async registrarEntrada(empleado: any) {
    const horaActual = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Comparar con hora de entrada del restaurante
    const horaEntradaRestaurante = this.horaEntradaRestaurante();
    const [horaEntrada, minutoEntrada] = horaEntradaRestaurante.split(':').map(Number);
    const [horaActualNum, minutoActual] = horaActual.split(':').map(Number);

    const tiempoEntrada = horaEntrada * 60 + minutoEntrada;
    const tiempoActual = horaActualNum * 60 + minutoActual;

    let estado = 'presente';
    if (tiempoActual > tiempoEntrada) {
      estado = 'ingreso_tarde';
    }

    try {
      // Buscar si ya existe asistencia para este empleado en la fecha seleccionada
      const existingAsistencia = await this._asistenciaService.getByUserAndDate(empleado.id, this.fechaSeleccionada()).toPromise();

      if (existingAsistencia) {
        // Actualizar asistencia existente
        await this._asistenciaService.update(existingAsistencia.id, {
          hora_entrada: horaActual,
          estado: estado
        }).toPromise();
      } else {
        // Crear nueva asistencia
        await this._asistenciaService.create({
          user_id: empleado.id,
          fecha: this.fechaSeleccionada(),
          hora_entrada: horaActual,
          estado: estado
        }).toPromise();
      }

      // Recargar datos
      await this.loadAsistenciaData();
      const mensajeEstado = estado === 'ingreso_tarde' ? ' (Ingreso Tarde)' : '';
      alert(`Entrada registrada para ${empleado.name} ${empleado.surname} a las ${horaActual}${mensajeEstado}`);
    } catch (error) {
      console.error('Error registrando entrada:', error);
      alert('Error al registrar la entrada');
    }
  }

  async registrarSalida(empleado: any) {
    const horaActual = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Comparar con hora de salida del restaurante
    const horaSalidaRestaurante = this.horaSalidaRestaurante();
    const [horaSalida, minutoSalida] = horaSalidaRestaurante.split(':').map(Number);
    const [horaActualNum, minutoActual] = horaActual.split(':').map(Number);

    const tiempoSalida = horaSalida * 60 + minutoSalida;
    const tiempoActual = horaActualNum * 60 + minutoActual;

    let estado = 'presente';
    if (tiempoActual < tiempoSalida) {
      estado = 'salida_temprana';
    }

    try {
      // Buscar si ya existe asistencia para este empleado en la fecha seleccionada
      const existingAsistencia = await this._asistenciaService.getByUserAndDate(empleado.id, this.fechaSeleccionada()).toPromise();

      if (existingAsistencia) {
        // Actualizar asistencia existente
        await this._asistenciaService.update(existingAsistencia.id, {
          hora_salida: horaActual,
          estado: estado
        }).toPromise();
      } else {
        // Crear nueva asistencia con salida
        await this._asistenciaService.create({
          user_id: empleado.id,
          fecha: this.fechaSeleccionada(),
          hora_salida: horaActual,
          estado: estado
        }).toPromise();
      }

      // Recargar datos
      await this.loadAsistenciaData();
      const mensajeEstado = estado === 'salida_temprana' ? ' (Salida Temprana)' : '';
      alert(`Salida registrada para ${empleado.name} ${empleado.surname} a las ${horaActual}${mensajeEstado}`);
    } catch (error) {
      console.error('Error registrando salida:', error);
      alert('Error al registrar la salida');
    }
  }

  registrarFalta(empleado: any) {
    if (confirm(`¿Está seguro de registrar una falta para ${empleado.name} ${empleado.surname}?`)) {
      // Buscar si ya existe asistencia para este empleado
      const asistenciaIndex = this.asistenciaData().findIndex(a => a.id === empleado.id);
      const nuevaAsistencia = [...this.asistenciaData()];

      if (asistenciaIndex !== -1) {
        // Actualizar asistencia existente
        nuevaAsistencia[asistenciaIndex] = {
          ...nuevaAsistencia[asistenciaIndex],
          hora_entrada: null,
          hora_salida: null,
          estado: 'ausente'
        };
      } else {
        // Crear nueva asistencia con falta
        nuevaAsistencia.push({
          id: empleado.id,
          user_id: empleado.id,
          hora_entrada: null,
          hora_salida: null,
          fecha: this.fechaSeleccionada(),
          estado: 'ausente',
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      this.asistenciaData.set(nuevaAsistencia);
      alert(`Falta registrada para ${empleado.name} ${empleado.surname}`);
    }
  }

  mostrarHistorial() {
    // Navegar a la página completa del historial
    window.location.href = '/admin/asistencia/historial';
  }

  closeHistorialModal() {
    this.showHistorialModal.set(false);
    this.historialData.set([]);
  }

  onFechaChange() {
    // Recargar datos cuando cambia la fecha
    console.log('Fecha cambiada a:', this.fechaSeleccionada());
    this.loadAsistenciaData();
  }

  fechaAnterior() {
    const fecha = new Date(this.fechaSeleccionada());
    fecha.setDate(fecha.getDate() - 1);
    this.fechaSeleccionada.set(fecha.toISOString().split('T')[0]);
    this.onFechaChange();
  }

  fechaSiguiente() {
    const fecha = new Date(this.fechaSeleccionada());
    fecha.setDate(fecha.getDate() + 1);
    this.fechaSeleccionada.set(fecha.toISOString().split('T')[0]);
    this.onFechaChange();
  }

  fechaHoy() {
    const hoy = new Date().toISOString().split('T')[0];
    this.fechaSeleccionada.set(hoy);
    this.onFechaChange();
  }

  actualizarHorariosGlobales() {
    // Aquí se podría guardar en localStorage o enviar al backend
    console.log('Horarios globales actualizados:', {
      entrada: this.horaEntradaGlobal(),
      salida: this.horaSalidaGlobal()
    });
    // Por ahora solo mostramos un mensaje
    alert('Horarios globales actualizados. Los empleados sin horarios personalizados usarán estos horarios.');
  }

  // Métodos para el escáner QR
  abrirEscanerEntrada() {
    this.scannerType.set('entrada');
    this.showScannerModal.set(true);
    this.scannerEnabled.set(true);
  }

  abrirEscanerSalida() {
    this.scannerType.set('salida');
    this.showScannerModal.set(true);
    this.scannerEnabled.set(true);
  }

  cerrarScannerModal() {
    this.showScannerModal.set(false);
    this.scannerEnabled.set(false);
    this.stopScanning();
  }

  // Método para escanear QR usando ML Kit (nativo)
  async startScanning() {
    try {
      console.log('Iniciando escaneo de QR con ML Kit...');

      // Verificar si el plugin está disponible
      const isSupported = await BarcodeScanner.isSupported();
      if (!isSupported) {
        toast.error('Escaneo no soportado', {
          description: 'Este dispositivo no soporta el escaneo de códigos QR.',
        });
        return;
      }

      // Verificar permisos de cámara
      const hasPermission = await BarcodeScanner.checkPermissions();
      if (hasPermission.camera === 'denied') {
        // Solicitar permisos
        const permission = await BarcodeScanner.requestPermissions();
        if (permission.camera === 'denied') {
          toast.error('Permisos denegados', {
            description: 'Se requieren permisos de cámara para escanear códigos QR.',
          });
          return;
        }
      }

      // Iniciar escaneo
      const { barcodes } = await BarcodeScanner.scan();
      if (barcodes.length > 0) {
        const qrData = barcodes[0].rawValue;
        console.log('QR escaneado:', qrData);
        this.procesarQrEscaneado(qrData);
      } else {
        toast.info('Sin códigos detectados', {
          description: 'No se detectó ningún código QR. Intente nuevamente.',
        });
      }

    } catch (error: any) {
      console.error('Error en escaneo ML Kit:', error);
      toast.error('Error en escaneo', {
        description: 'Hubo un problema al escanear el código QR.',
      });
    }
  }

  stopScanning() {
    // Con ML Kit, no necesitamos detener streams manualmente
    // El plugin maneja esto automáticamente
  }

  // Manejar el escaneo exitoso del QR
  onQrCodeResult(result: string) {
    console.log('QR Code scanned:', result);
    this.procesarQrEscaneado(result);
  }

  // Manejar errores del escáner
  onScannerError(error: any) {
    console.error('Scanner error:', error);
    toast.error('Error en el escáner', {
      description: 'Hubo un problema con la cámara. Verifica los permisos.',
    });
  }

  // Procesar el QR escaneado
  private async procesarQrEscaneado(qrData: string) {
    try {
      // Validar formato del QR (debe ser "user-id:{numero}")
      const userIdMatch = qrData.match(/^user-id:(\d+)$/);
      if (!userIdMatch) {
        toast.error('Código QR inválido', {
          description: 'El código QR escaneado no tiene el formato correcto.',
        });
        return;
      }

      const userId = parseInt(userIdMatch[1], 10);

      // Buscar el usuario
      const users = this.usersResource.value() || [];
      const user = users.find((u: any) => u.id === userId);

      if (!user) {
        toast.error('Usuario no encontrado', {
          description: 'El usuario del código QR no existe en el sistema.',
        });
        return;
      }

      // Cerrar el modal del escáner
      this.cerrarScannerModal();

      // Procesar según el tipo de registro
      if (this.scannerType() === 'entrada') {
        await this.registrarEntradaDesdeQr(user);
      } else {
        await this.registrarSalidaDesdeQr(user);
      }

    } catch (error) {
      console.error('Error procesando QR:', error);
      toast.error('Error procesando código QR', {
        description: 'Hubo un problema al procesar el código QR escaneado.',
      });
    }
  }

  // Registrar entrada desde QR
  private async registrarEntradaDesdeQr(user: any) {
    const horaActual = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Comparar con hora de entrada del restaurante
    const horaEntradaRestaurante = this.horaEntradaRestaurante();
    const [horaEntrada, minutoEntrada] = horaEntradaRestaurante.split(':').map(Number);
    const [horaActualNum, minutoActual] = horaActual.split(':').map(Number);

    const tiempoEntrada = horaEntrada * 60 + minutoEntrada;
    const tiempoActual = horaActualNum * 60 + minutoActual;

    let estado = 'presente';
    if (tiempoActual > tiempoEntrada) {
      estado = 'ingreso_tarde';
    }

    try {
      // Buscar si ya existe asistencia para este usuario en la fecha seleccionada
      const existingAsistencia = await this._asistenciaService.getByUserAndDate(user.id, this.fechaSeleccionada()).toPromise();

      if (existingAsistencia) {
        // Actualizar asistencia existente
        await this._asistenciaService.update(existingAsistencia.id, {
          hora_entrada: horaActual,
          estado: estado
        }).toPromise();
      } else {
        // Crear nueva asistencia
        await this._asistenciaService.create({
          user_id: user.id,
          fecha: this.fechaSeleccionada(),
          hora_entrada: horaActual,
          estado: estado
        }).toPromise();
      }

      // Recargar datos
      await this.loadAsistenciaData();

      const mensajeEstado = estado === 'ingreso_tarde' ? ' (Ingreso Tarde)' : '';
      toast.success(`Entrada registrada`, {
        description: `${user.name} ${user.surname} - ${horaActual}${mensajeEstado}`,
      });

    } catch (error) {
      console.error('Error registrando entrada desde QR:', error);
      toast.error('Error al registrar entrada', {
        description: 'No se pudo registrar la entrada. Intente nuevamente.',
      });
    }
  }

  // Registrar salida desde QR
  private async registrarSalidaDesdeQr(user: any) {
    const horaActual = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Comparar con hora de salida del restaurante
    const horaSalidaRestaurante = this.horaSalidaRestaurante();
    const [horaSalida, minutoSalida] = horaSalidaRestaurante.split(':').map(Number);
    const [horaActualNum, minutoActual] = horaActual.split(':').map(Number);

    const tiempoSalida = horaSalida * 60 + minutoSalida;
    const tiempoActual = horaActualNum * 60 + minutoActual;

    let estado = 'presente';
    if (tiempoActual < tiempoSalida) {
      estado = 'salida_temprana';
    }

    try {
      // Buscar si ya existe asistencia para este usuario en la fecha seleccionada
      const existingAsistencia = await this._asistenciaService.getByUserAndDate(user.id, this.fechaSeleccionada()).toPromise();

      if (existingAsistencia) {
        // Actualizar asistencia existente
        await this._asistenciaService.update(existingAsistencia.id, {
          hora_salida: horaActual,
          estado: estado
        }).toPromise();
      } else {
        // Crear nueva asistencia con salida
        await this._asistenciaService.create({
          user_id: user.id,
          fecha: this.fechaSeleccionada(),
          hora_salida: horaActual,
          estado: estado
        }).toPromise();
      }

      // Recargar datos
      await this.loadAsistenciaData();

      const mensajeEstado = estado === 'salida_temprana' ? ' (Salida Temprana)' : '';
      toast.success(`Salida registrada`, {
        description: `${user.name} ${user.surname} - ${horaActual}${mensajeEstado}`,
      });

    } catch (error) {
      console.error('Error registrando salida desde QR:', error);
      toast.error('Error al registrar salida', {
        description: 'No se pudo registrar la salida. Intente nuevamente.',
      });
    }
  }
}

export default AdminAsistenciaPageComponent;