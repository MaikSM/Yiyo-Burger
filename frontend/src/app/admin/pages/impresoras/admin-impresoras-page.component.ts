import { ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfigService, PosConfig } from '../../services/config.service';
import { PedidosService } from '../../services/pedidos.service';
import { firstValueFrom, Subscription } from 'rxjs';

@Component({
  selector: 'admin-impresoras-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-impresoras-page.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminImpresorasPageComponent implements OnInit, OnDestroy {
  private configService = inject(ConfigService);
  private pedidosService = inject(PedidosService);
  private fb = inject(FormBuilder);

  configForm: FormGroup = this.fb.group({
    printer_caja_ip: ['', [Validators.required]],
    printer_pizzas_ip: ['', [Validators.required]],
    printer_parrilla_ip: ['', [Validators.required]],
  });

  isLoading = signal(true);
  isSaving = signal(false);
  testingPrinter = signal<'Caja' | 'Parrilla' | 'Pizzas' | null>(null);
  isDownloadingDb = signal(false);
  isImportingDb = signal(false);
  selectedDbFile = signal<File | null>(null);
  
  systemPrinters = signal<string[]>([]);
  isScanningPrinters = signal(false);

  // Monitor de Cola de Impresión
  printJobs = signal<any[]>([]);
  queueStats = signal<{
    pendientes: number;
    imprimiendo: number;
    impresos_hoy: number;
    fallidos: number;
    total: number;
  }>({ pendientes: 0, imprimiendo: 0, impresos_hoy: 0, fallidos: 0, total: 0 });
  isLoadingJobs = signal(false);
  isRetryingJob = signal<string | null>(null);
  isRetryingAll = signal(false);

  private queueInterval?: any;
  private sseSub?: Subscription;

  ngOnInit(): void {
    this.loadConfig();
    this.scanSystemPrinters();
    this.loadPrintQueue();

    // Actualización periódica en vivo de la cola cada 4 segundos
    this.queueInterval = setInterval(() => {
      this.loadPrintQueue(true);
    }, 4000);

    // Escuchar eventos en tiempo real para refresco instantáneo al fallar o tener éxito
    this.sseSub = this.pedidosService.getEventsStream().subscribe({
      next: (event) => {
        if (event?.type === 'impresion_fallida' || event?.type === 'impresion_exitosa') {
          this.loadPrintQueue(true);
        }
      },
      error: (err) => console.warn('[AdminImpresoras] SSE reconectando...', err),
    });
  }

  ngOnDestroy(): void {
    if (this.queueInterval) clearInterval(this.queueInterval);
    if (this.sseSub) this.sseSub.unsubscribe();
  }

  async scanSystemPrinters() {
    this.isScanningPrinters.set(true);
    try {
      const res = await firstValueFrom(this.configService.getSystemPrinters());
      if (res.success && res.printers && res.printers.length > 0) {
        this.systemPrinters.set(res.printers);
        alert(`✅ Se detectaron ${res.printers.length} impresoras en tu equipo:\n\n` + res.printers.map(p => `• ${p}`).join('\n'));
      } else {
        alert('⚠️ No se encontraron impresoras activas registradas en Windows.');
      }
    } catch (error: any) {
      console.error('Error detectando impresoras de Windows:', error);
      alert('❌ Error al consultar las impresoras de Windows: ' + (error?.error?.message || error?.message || 'Error de conexión con el backend.'));
    } finally {
      this.isScanningPrinters.set(false);
    }
  }

  selectPrinterFor(tipo: 'Caja' | 'Parrilla' | 'Pizzas', printerName: string) {
    if (!printerName) return;
    const ipField = tipo === 'Caja' ? 'printer_caja_ip' : (tipo === 'Parrilla' ? 'printer_parrilla_ip' : 'printer_pizzas_ip');
    this.configForm.get(ipField)?.setValue(printerName);
  }

  async testPrinter(tipo: 'Caja' | 'Parrilla' | 'Pizzas') {
    const ipField = tipo === 'Caja' ? 'printer_caja_ip' : (tipo === 'Parrilla' ? 'printer_parrilla_ip' : 'printer_pizzas_ip');
    const ip = this.configForm.get(ipField)?.value;

    if (!ip) {
      alert(`Ingresa primero una dirección IP para la impresora de ${tipo}`);
      return;
    }

    this.testingPrinter.set(tipo);
    try {
      const res = await firstValueFrom(this.configService.testPrinter(tipo, ip));
      if (res.success) {
        alert(res.message);
      } else {
        alert(`❌ Falló la prueba de la impresora (${tipo}):\n\n${res.message}`);
      }
    } catch (error: any) {
      console.error('Error al probar impresora:', error);
      alert(`❌ Error probando impresora de ${tipo}: ${error?.error?.message || error?.message || 'No se pudo conectar al servidor backend.'}`);
    } finally {
      this.testingPrinter.set(null);
    }
  }

  async loadConfig() {
    this.isLoading.set(true);
    try {
      const config = await firstValueFrom(this.configService.getConfig());
      this.configForm.patchValue(config);
    } catch (error) {
      console.error('Error cargando configuración', error);
      alert('Error cargando configuración de impresoras');
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveConfig() {
    if (this.configForm.invalid) return;

    this.isSaving.set(true);
    try {
      const config: PosConfig = this.configForm.value;
      await firstValueFrom(this.configService.updateConfig(config));
      alert('Configuración guardada exitosamente.');
    } catch (error) {
      console.error('Error guardando', error);
      alert('Error al guardar configuración');
    } finally {
      this.isSaving.set(false);
    }
  }

  async downloadDatabaseBackup() {
    this.isDownloadingDb.set(true);
    try {
      const blob = await firstValueFrom(this.configService.exportDatabase());
      const url = window.URL.createObjectURL(blob);
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `restausync_backup_${dateStr}.sqlite`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar base de datos:', error);
      alert('Error al descargar la copia de seguridad de la base de datos');
    } finally {
      this.isDownloadingDb.set(false);
    }
  }

  onDbFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (!file.name.endsWith('.sqlite') && !file.name.endsWith('.db')) {
        alert('Por favor selecciona un archivo de base de datos válido (.sqlite o .db)');
        input.value = '';
        this.selectedDbFile.set(null);
        return;
      }
      this.selectedDbFile.set(file);
    }
  }

  async importDatabaseBackup(): Promise<void> {
    const file = this.selectedDbFile();
    if (!file) {
      alert('Selecciona primero un archivo de base de datos (.sqlite) para importar.');
      return;
    }

    if (!confirm('⚠️ ATENCIÓN: Importar una base de datos reemplazará los datos actuales por los del archivo seleccionado. Se creará una copia de seguridad previa automáticamente.\n\n¿Deseas continuar?')) {
      return;
    }

    this.isImportingDb.set(true);
    try {
      const res = await firstValueFrom(this.configService.importDatabase(file));
      alert(`✅ ${res.message}\n\nRespaldo previo guardado como: ${res.backup || 'backups/'}`);
      this.selectedDbFile.set(null);
    } catch (error: any) {
      console.error('Error al importar la base de datos:', error);
      alert(error?.error?.error || 'Error al importar la base de datos');
    } finally {
      this.isImportingDb.set(false);
    }
  }

  async loadPrintQueue(silent: boolean = false) {
    if (!silent) this.isLoadingJobs.set(true);
    try {
      const res = await firstValueFrom(this.configService.getPrintQueueJobs(50));
      if (res) {
        this.printJobs.set(res.jobs || []);
        if (res.stats) {
          this.queueStats.set(res.stats);
        }
      }
    } catch (err) {
      console.error('Error cargando cola de impresión:', err);
    } finally {
      if (!silent) this.isLoadingJobs.set(false);
    }
  }

  async retryJob(id: string) {
    this.isRetryingJob.set(id);
    try {
      const res = await firstValueFrom(this.configService.retryPrintJob(id));
      if (res.success) {
        await this.loadPrintQueue(true);
      } else {
        alert('No se pudo reencolar el trabajo de impresión.');
      }
    } catch (err: any) {
      console.error('Error al reintentar trabajo:', err);
      alert('Error reintentando impresión: ' + (err?.error?.error || err.message));
    } finally {
      this.isRetryingJob.set(null);
    }
  }

  async retryAllJobs() {
    this.isRetryingAll.set(true);
    try {
      const res = await firstValueFrom(this.configService.retryAllPrintJobs());
      alert(`✅ ${res.message || 'Trabajos fallidos reencolados con éxito.'}`);
      await this.loadPrintQueue(true);
    } catch (err: any) {
      console.error('Error al reintentar todos los trabajos:', err);
      alert('Error reintentando trabajos: ' + (err?.error?.error || err.message));
    } finally {
      this.isRetryingAll.set(false);
    }
  }

  getTicketLabel(tipo: string): string {
    switch (tipo) {
      case 'cocina_pizzas': return '🍕 Cocina: Pizzas';
      case 'cocina_parrilla': return '🔥 Cocina: Parrilla';
      case 'domicilio': return '🛵 Domicilio';
      case 'factura': return '🧾 Factura / Recibo';
      case 'precuenta': return '📋 Pre-cuenta Mesa';
      case 'cajon': return '💵 Apertura Cajón';
      case 'prueba': return '🧪 Ticket Prueba';
      default: return tipo || 'Impresión';
    }
  }

  getTicketBadgeClass(tipo: string): string {
    switch (tipo) {
      case 'cocina_pizzas': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'cocina_parrilla': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'domicilio': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'factura': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'precuenta': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'cajon': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default: return 'bg-gray-700 text-gray-300 border-gray-600';
    }
  }

  getStatusBadgeClass(estado: string): string {
    switch (estado) {
      case 'impreso': return 'bg-emerald-900/40 text-emerald-300 border-emerald-500/40';
      case 'imprimiendo': return 'bg-blue-900/40 text-blue-300 border-blue-500/40';
      case 'pendiente': return 'bg-yellow-900/40 text-yellow-300 border-yellow-500/40';
      case 'fallido': return 'bg-red-900/50 text-red-300 border-red-500/50';
      default: return 'bg-gray-800 text-gray-300 border-gray-700';
    }
  }

  formatJobDate(dateInput: string | Date | undefined): string {
    if (!dateInput) return '-';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const secs = String(d.getSeconds()).padStart(2, '0');
    return `${hours}:${mins}:${secs}`;
  }
}

export default AdminImpresorasPageComponent;
