import { ChangeDetectionStrategy, Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { PedidosService, Order, OrderItem } from '../../services/pedidos.service';
import { GastosService, Gasto } from '../../services/gastos.service';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface GastoDiario {
  id: string;
  fecha: string;
  monto: number;
  metodoPago: string;
  motivo: string;
  categoria: 'Pedidos / Insumos' | 'Operativo' | 'Caja Chica' | 'Otros';
  fechaRegistro: string;
}

import { CierreCajaService } from '../../services/cierre-caja.service';

interface CierreDiario {
  fecha: string;
  fechaFormateada: string;
  totalVentas: number;
  ingresoBruto: number;
  totalGastos: number;
  ingresoNeto: number;
  ingresoTotal: number;
  metodosPago: { nombre: string; bruto: number; gastos: number; neto: number; total: number }[];
  productosVendidos: { nombre: string; qty: number; total: number }[];
  gastos: GastoDiario[];
}

@Component({
  selector: 'admin-reportes-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-reportes-page.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminReportesPageComponent implements OnInit {
  private pedidosService = inject(PedidosService);
  private gastosService = inject(GastosService);
  private cierreCajaService = inject(CierreCajaService);
  
  Math = Math;

  historialCierresBD = signal<any[]>([]);

  activeTab = signal<'finanzas' | 'menu' | 'historial' | 'cierres'>('finanzas');
  selectedCierre = signal<CierreDiario | null>(null);
  selectedOrder = signal<Order | null>(null);
  
  allOrders = signal<Order[]>([]);
  gastosStorage = signal<Record<string, GastoDiario[]>>({});

  // Mini-terminal de Gastos
  showGastoModal = signal<boolean>(false);
  gastoMonto = signal<number | null>(null);
  gastoMetodoPago = signal<string>('Efectivo');
  gastoMotivo = signal<string>('');
  gastoCategoria = signal<'Pedidos / Insumos' | 'Operativo' | 'Caja Chica' | 'Otros'>('Pedidos / Insumos');
  
  // Date filters
  filterType = signal<'dia' | 'mes' | 'ano' | 'todos'>('dia');
  selectedDate = signal<string>('');

  // Paginación de Historial Combinado
  historialPage = signal<number>(1);
  historialPageSize = signal<number>(15);

  paginatedHistorialOrders = computed(() => {
    const orders = this.filteredOrders();
    const start = (this.historialPage() - 1) * this.historialPageSize();
    const end = start + this.historialPageSize();
    return orders.slice(start, end);
  });

  historialTotalPages = computed(() => {
    const total = this.filteredOrders().length;
    const size = this.historialPageSize();
    return Math.ceil(total / size) || 1;
  });

  setHistorialPageSize(size: any) {
    this.historialPageSize.set(Number(size));
    this.historialPage.set(1);
  }

  goToHistorialPage(page: number) {
    if (page >= 1 && page <= this.historialTotalPages()) {
      this.historialPage.set(page);
    }
  }

  prevHistorialPage() {
    if (this.historialPage() > 1) {
      this.historialPage.set(this.historialPage() - 1);
    }
  }

  nextHistorialPage() {
    if (this.historialPage() < this.historialTotalPages()) {
      this.historialPage.set(this.historialPage() + 1);
    }
  }
  
  ngOnInit() {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    this.selectedDate.set(todayStr);
    
    this.cargarGastos();
    this.cargarHistorialCierres();
    this.loadData();
  }

  cargarHistorialCierres() {
    this.cierreCajaService.getHistorial().subscribe({
      next: (cierres) => this.historialCierresBD.set(cierres || []),
      error: (err) => console.error('Error al cargar historial de cierres de la BD:', err)
    });
  }

  cargarGastos() {
    this.gastosService.getAll().subscribe({
      next: (apiGastos: Gasto[]) => {
        const map: Record<string, GastoDiario[]> = {};
        (apiGastos || []).forEach(g => {
          const item: GastoDiario = {
            id: g.id || '',
            fecha: g.fecha,
            monto: Number(g.monto) || 0,
            metodoPago: g.metodo_pago || 'Efectivo',
            motivo: g.motivo,
            categoria: (g.categoria as any) || 'Otros',
            fechaRegistro: g.created_at ? new Date(g.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : ''
          };
          if (!map[g.fecha]) map[g.fecha] = [];
          map[g.fecha].push(item);
        });
        this.gastosStorage.set(map);
      },
      error: (err) => console.error('Error cargando gastos del backend:', err)
    });
  }

  openGastoModal() {
    this.gastoMonto.set(null);
    this.gastoMetodoPago.set('Efectivo');
    this.gastoMotivo.set('');
    this.gastoCategoria.set('Pedidos / Insumos');
    this.showGastoModal.set(true);
  }

  closeGastoModal() {
    this.showGastoModal.set(false);
  }

  registrarGasto() {
    const cierre = this.activeSelectedCierre();
    if (!cierre) return;
    
    const monto = Number(this.gastoMonto());
    const motivo = (this.gastoMotivo() || '').trim();
    const metodo = this.gastoMetodoPago() || 'Efectivo';
    const categoria = this.gastoCategoria();

    if (!monto || monto <= 0) {
      alert('⚠️ Ingresa un monto válido mayor a 0');
      return;
    }
    if (!motivo) {
      alert('⚠️ Ingresa el motivo o concepto del gasto');
      return;
    }

    const payload: Partial<Gasto> = {
      fecha: cierre.fecha,
      monto,
      metodo_pago: metodo,
      motivo,
      categoria
    };

    this.gastosService.create(payload).subscribe({
      next: () => {
        this.cargarGastos();
        this.closeGastoModal();
      },
      error: (err) => alert(err.error?.message || 'Error al registrar el gasto en la base de datos')
    });
  }

  eliminarGasto(gastoId: string) {
    if (!confirm('¿Seguro que deseas eliminar este gasto registrado?')) return;
    this.gastosService.delete(gastoId).subscribe({
      next: () => this.cargarGastos(),
      error: (err) => alert(err.error?.message || 'Error al eliminar el gasto de la base de datos')
    });
  }

  changeFilterType(type: 'dia' | 'mes' | 'ano' | 'todos') {
    this.filterType.set(type);
    this.historialPage.set(1);
    const today = new Date();
    if (type === 'dia') {
      this.selectedDate.set(today.toISOString().split('T')[0]);
    } else if (type === 'mes') {
      const currentMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
      this.selectedDate.set(currentMonth);
    } else if (type === 'ano') {
      this.selectedDate.set(String(today.getFullYear()));
    } else {
      this.selectedDate.set('');
    }
  }
  
  loadData() {
    this.pedidosService.getAll(true).subscribe({
      next: (apiPedidos) => {
        const validos = (apiPedidos || []).filter((p: Order) => p.estado !== 'Cancelado');
        const uniqueMap = new Map<string | number, Order>();
        validos.forEach((p: Order) => {
          let itemsList = p.items || [];
          if (typeof itemsList === 'string') {
            try { itemsList = JSON.parse(itemsList); } catch(e) { itemsList = []; }
          }
          p.items = Array.isArray(itemsList) ? itemsList : [];
          uniqueMap.set(p.id, p);
        });
        const uniqueOrders = Array.from(uniqueMap.values());
        const sorted = uniqueOrders.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        this.allOrders.set(sorted);
      },
      error: (e) => {
        console.error('Error cargando pedidos de la API:', e);
        this.allOrders.set([]);
      }
    });
  }

  getMetodoPagoValue(metodoRaw: any): string {
    if (!metodoRaw) return 'Efectivo';
    const raw = String(metodoRaw).trim();
    const m = raw.toLowerCase();
    
    if (m === 'efectivo' || m === 'efec') return 'Efectivo';
    if (m === 'tarjeta' || m === 'datafono' || m === 'datáfono' || m === 'pos') return 'Tarjeta';
    if (m === 'nequi') return 'Nequi';
    if (m === 'daviplata' || m === 'davi') return 'Daviplata';
    if (m === 'bre-b' || m === 'breb' || m === 'bre b') return 'Bre-B';
    if (m === 'bold') return 'Bold';
    if (m === 'crédito' || m === 'credito') return 'Crédito';
    if (m === 'transferencia' || m === 'transfiya' || m === 'bancolombia' || m === 'banco') return 'Transferencia';
    if (m === 'otros' || m === 'otro') return 'Otros';

    if (m.includes('nequi')) return 'Nequi';
    if (m.includes('davi')) return 'Daviplata';
    if (m.includes('bre')) return 'Bre-B';
    if (m.includes('bold')) return 'Bold';
    if (m.includes('cred') || m.includes('créd')) return 'Crédito';
    if (m.includes('tarjeta') || m.includes('dataf')) return 'Tarjeta';
    if (m.includes('transf') || m.includes('banc')) return 'Transferencia';
    if (m.includes('efec')) return 'Efectivo';

    if (['Efectivo', 'Tarjeta', 'Nequi', 'Daviplata', 'Bre-B', 'Bold', 'Crédito', 'Transferencia', 'Otros'].includes(raw)) {
      return raw;
    }

    return 'Otros';
  }

  cambiarMetodoPago(order: any, nuevoMetodo: string) {
    if (!order || !order.id || !nuevoMetodo) return;
    if (this.getMetodoPagoValue(order.metodo_pago) === nuevoMetodo) return;

    const metodoAnterior = order.metodo_pago;
    order.metodo_pago = nuevoMetodo;
    // Forzar actualización de las señales computadas de reportes
    this.allOrders.set([...this.allOrders()]);

    this.pedidosService.update(order.id, { metodo_pago: nuevoMetodo }).subscribe({
      next: () => {
        console.log(`[Reportes] Método de pago de orden #${order.orderNumber || order.id} actualizado a: ${nuevoMetodo}`);
      },
      error: (err) => {
        console.error('Error actualizando método de pago en reportes:', err);
        order.metodo_pago = metodoAnterior;
        this.allOrders.set([...this.allOrders()]);
        alert('Error al actualizar el método de pago en el servidor.');
      }
    });
  }

  filteredOrders = computed(() => {
    const orders = this.allOrders();
    const type = this.filterType();
    const dateVal = this.selectedDate();
    
    if (type === 'todos' || !dateVal) return orders;
    
    return orders.filter(order => {
      if (!order.fecha) return false;
      const d = new Date(order.fecha);
      if (isNaN(d.getTime())) return false;
      const orderDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (type === 'dia') {
        return orderDateStr === dateVal;
      }
      if (type === 'mes') {
        return orderDateStr.startsWith(dateVal);
      }
      if (type === 'ano') {
        return orderDateStr.startsWith(dateVal);
      }
      return true;
    });
  });

  // --- DASHBOARD METRICS ---
  
  totalIncome = computed(() => {
    return this.filteredOrders().reduce((acc, order) => acc + (order.total || 0), 0);
  });
  
  totalOrdersCount = computed(() => this.filteredOrders().length);
  
  averageTicket = computed(() => {
    const count = this.totalOrdersCount();
    return count > 0 ? this.totalIncome() / count : 0;
  });

  // Daily Chart Data
  dailyChartData = computed(() => {
    const orders = this.filteredOrders();
    const grouped: Record<string, number> = {};
    
    orders.forEach(order => {
      const date = new Date(order.fecha).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
      grouped[date] = (grouped[date] || 0) + order.total;
    });
    
    const labels = Object.keys(grouped).reverse();
    const data = Object.values(grouped).reverse();
    const max = Math.max(...data, 1);
    
    return {
      labels,
      data,
      max,
      heights: data.map(val => `${(val / max) * 100}%`)
    };
  });

  // --- FINANZAS METRICS ---
  
  totalSubtotal = computed(() => {
    return this.filteredOrders().reduce((acc, order) => acc + (order.subtotal || 0), 0);
  });

  totalTaxes = computed(() => {
    return this.filteredOrders().reduce((acc, order) => acc + (order.impuesto_valor || 0), 0);
  });
  
  totalTips = computed(() => {
    return this.filteredOrders().reduce((acc, order) => acc + (order.propina_valor || 0), 0);
  });

  ingresosPorCanal = computed(() => {
    const orders = this.filteredOrders();
    let mesas = 0;
    let domicilios = 0;
    orders.forEach(o => {
      if (o.tipo === 'Mesa') mesas += (o.total || 0);
      else domicilios += (o.total || 0);
    });
    const total = mesas + domicilios || 1;
    return {
      mesas: { total: mesas, pct: (mesas / total) * 100 },
      domicilios: { total: domicilios, pct: (domicilios / total) * 100 }
    };
  });

  diasSemanaStats = computed(() => {
    const orders = this.filteredOrders();
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const stats: Record<string, number> = {
      'Domingo': 0, 'Lunes': 0, 'Martes': 0, 'Miércoles': 0, 'Jueves': 0, 'Viernes': 0, 'Sábado': 0
    };
    
    orders.forEach(o => {
      const fecha = new Date(o.fecha);
      if (!isNaN(fecha.getTime())) {
        const diaStr = dias[fecha.getDay()];
        stats[diaStr] += (o.total || 0);
      }
    });

    const arr = Object.keys(stats)
      .map(name => ({ name, value: stats[name] }))
      .sort((a, b) => b.value - a.value);
      
    const max = arr[0]?.value || 1;
    return arr.map(item => ({ ...item, pctMax: (item.value / max) * 100 }));
  });

  paymentMethodsData = computed(() => {
    const orders = this.filteredOrders();
    const methods: Record<string, number> = {
      'Efectivo': 0,
      'Tarjeta': 0,
      'Nequi': 0,
      'Daviplata': 0,
      'Bre-B': 0,
      'Bold': 0,
      'Crédito': 0,
      'Transferencia': 0,
      'Otros': 0
    };
    
    orders.forEach(order => {
      const method = this.getMetodoPagoValue(order.metodo_pago);
      if (methods[method] !== undefined) {
        methods[method] += (order.total || 0);
      } else {
        methods['Otros'] += (order.total || 0);
      }
    });
    
    const validMethods = Object.entries(methods)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
      
    const total = validMethods.reduce((sum, item) => sum + item.value, 0) || 1;
    
    return validMethods.map(item => ({
      ...item,
      percentage: (item.value / total) * 100
    })).sort((a, b) => b.value - a.value);
  });

  // --- MENU STATS ---
  
  productStats = computed(() => {
    const orders = this.filteredOrders();
    const stats: Record<string, { nombre: string, qty: number, total: number }> = {};
    
    orders.forEach(order => {
      let rawItems = order.items || [];
      if (typeof rawItems === 'string') {
        try { rawItems = JSON.parse(rawItems); } catch(e) { rawItems = []; }
      }
      if (Array.isArray(rawItems)) {
        rawItems.forEach(item => {
          const key = item.id || item.nombre || 'Producto';
          if (!stats[key]) {
            stats[key] = { nombre: item.nombre || 'Producto', qty: 0, total: 0 };
          }
          const qty = Number(item.qty) || 1;
          const price = Number(item.precio) || 0;
          stats[key].qty += qty;
          stats[key].total += (price * qty);
        });
      }
    });
    
    const itemsArray = Object.values(stats);
    itemsArray.sort((a, b) => b.qty - a.qty);
    
    return itemsArray;
  });

  topSold = computed(() => {
    return this.productStats().slice(0, 10);
  });

  leastSold = computed(() => {
    const stats = this.productStats();
    return stats.slice().reverse().slice(0, 10);
  });

  // --- CIERRES DIARIOS ---
  
  cierresDiarios = computed(() => {
    const orders = this.filteredOrders();
    const allGastos = this.gastosStorage();
    const grouped: Record<string, CierreDiario> = {};
    
    orders.forEach(order => {
      const fechaObj = new Date(order.fecha);
      const fecha = isNaN(fechaObj.getTime())
        ? 'Fecha Desconocida'
        : `${fechaObj.getFullYear()}-${String(fechaObj.getMonth() + 1).padStart(2, '0')}-${String(fechaObj.getDate()).padStart(2, '0')}`;
      
      if (!grouped[fecha]) {
        let fechaFormateada = 'Fecha Desconocida';
        if (!isNaN(fechaObj.getTime())) {
          fechaFormateada = fechaObj.toLocaleDateString('es-CO', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          fechaFormateada = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
        }

        grouped[fecha] = {
          fecha,
          fechaFormateada,
          totalVentas: 0,
          ingresoBruto: 0,
          totalGastos: 0,
          ingresoNeto: 0,
          ingresoTotal: 0,
          metodosPago: [],
          productosVendidos: [],
          gastos: []
        };
      }
      
      const day = grouped[fecha];
      day.totalVentas++;
      day.ingresoBruto += (order.total || 0);
      day.ingresoTotal = day.ingresoBruto;
      
      // Payment method
      const method = this.getMetodoPagoValue(order.metodo_pago);
      let methodObj = day.metodosPago.find(m => m.nombre === method);
      if (!methodObj) {
        methodObj = { nombre: method, bruto: 0, gastos: 0, neto: 0, total: 0 };
        day.metodosPago.push(methodObj);
      }
      methodObj.bruto += (order.total || 0);
      methodObj.neto = methodObj.bruto - methodObj.gastos;
      methodObj.total = methodObj.neto;
      
      // Products
      let rawItems = order.items || [];
      if (typeof rawItems === 'string') {
        try { rawItems = JSON.parse(rawItems); } catch(e) { rawItems = []; }
      }
      if (Array.isArray(rawItems)) {
        rawItems.forEach(item => {
          const itemNombre = item.nombre || 'Producto';
          const prodIndex = day.productosVendidos.findIndex(p => p.nombre === itemNombre);
          const qty = Number(item.qty) || 1;
          const total = (Number(item.precio) || 0) * qty;
          if (prodIndex >= 0) {
            day.productosVendidos[prodIndex].qty += qty;
            day.productosVendidos[prodIndex].total += total;
          } else {
            day.productosVendidos.push({ nombre: itemNombre, qty, total });
          }
        });
      }
    });

    // Incorporar Gastos/Egresos registrados para cada día
    Object.keys(grouped).forEach(fecha => {
      const day = grouped[fecha];
      const dayGastos = allGastos[fecha] || [];
      day.gastos = dayGastos;
      day.totalGastos = dayGastos.reduce((sum, g) => sum + g.monto, 0);
      day.ingresoNeto = day.ingresoBruto - day.totalGastos;

      // Restar gastos del método de pago correspondiente
      dayGastos.forEach(gasto => {
        let methodObj = day.metodosPago.find(m => m.nombre.toLowerCase() === gasto.metodoPago.toLowerCase());
        if (!methodObj) {
          methodObj = { nombre: gasto.metodoPago, bruto: 0, gastos: 0, neto: 0, total: 0 };
          day.metodosPago.push(methodObj);
        }
        methodObj.gastos += gasto.monto;
        methodObj.neto = methodObj.bruto - methodObj.gastos;
        methodObj.total = methodObj.neto;
      });
    });
    
    // Sort descending by date
    const result = Object.values(grouped).sort((a, b) => (b.fecha > a.fecha ? 1 : -1));
    result.forEach(day => {
      day.metodosPago.sort((a, b) => b.neto - a.neto);
      day.productosVendidos.sort((a, b) => b.qty - a.qty);
    });
    
    return result;
  });

  activeSelectedCierre = computed(() => {
    const sel = this.selectedCierre();
    if (!sel) return null;
    return this.cierresDiarios().find(c => c.fecha === sel.fecha) || sel;
  });

  verDetalles(cierre: CierreDiario) {
    this.selectedCierre.set(cierre);
  }

  volverCierres() {
    this.selectedCierre.set(null);
  }

  verDetallePedido(order: Order) {
    this.selectedOrder.set(order);
  }

  volverHistorial() {
    this.selectedOrder.set(null);
  }

  setTab(tab: 'finanzas' | 'menu' | 'historial' | 'cierres') {
    this.activeTab.set(tab);
    this.selectedCierre.set(null);
    this.selectedOrder.set(null);
    this.historialPage.set(1);
  }

  exportCierreToPDF(cierre: CierreDiario) {
    const activeCierre = this.cierresDiarios().find(c => c.fecha === cierre.fecha) || cierre;
    const doc = new jsPDF();
    
    // Header Banner Naranja
    doc.setFillColor(234, 88, 12);
    doc.rect(0, 0, 210, 28, 'F');
    
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('YIYO BURGER - REPORTE DE CIERRE DE CAJA', 14, 17);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha del Cierre: ${activeCierre.fechaFormateada}`, 14, 24);

    // Resumen de Métricas Financieras
    doc.setFontSize(12);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen Financiero del Día', 14, 38);

    autoTable(doc, {
      startY: 42,
      head: [['Métrica de Caja', 'Monto ($)']],
      body: [
        ['Pedidos Completados (Tickets)', `${activeCierre.totalVentas} pedidos`],
        ['Total Ingreso Bruto de Ventas', `$${activeCierre.ingresoBruto.toLocaleString('es-CO')}`],
        ['Total Gastos y Egresos del Día (-)', `-$${activeCierre.totalGastos.toLocaleString('es-CO')}`],
        ['BALANCE NETO DISPONIBLE EN CAJA', `$${activeCierre.ingresoNeto.toLocaleString('es-CO')}`]
      ],
      headStyles: { fillColor: [31, 41, 55], fontStyle: 'bold' },
      bodyStyles: { fontSize: 10 },
      margin: { left: 14, right: 14 }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;

    // Desglose por Métodos de Pago
    doc.setFontSize(12);
    doc.setTextColor(234, 88, 12);
    doc.setFont('helvetica', 'bold');
    doc.text('Desglose por Métodos de Pago', 14, currentY);

    autoTable(doc, {
      startY: currentY + 4,
      head: [['Método de Pago', 'Ingreso Bruto', 'Gastos Restados (-)', 'Saldo Neto Disponible']],
      body: activeCierre.metodosPago.map(m => [
        m.nombre,
        `$${m.bruto.toLocaleString('es-CO')}`,
        `-$${m.gastos.toLocaleString('es-CO')}`,
        `$${m.neto.toLocaleString('es-CO')}`
      ]),
      headStyles: { fillColor: [234, 88, 12], fontStyle: 'bold' },
      bodyStyles: { fontSize: 10 },
      margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // Gastos y Egresos del Día
    if (activeCierre.gastos && activeCierre.gastos.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
      doc.text(`Gastos y Egresos del Día (${activeCierre.gastos.length} egresos)`, 14, currentY);

      autoTable(doc, {
        startY: currentY + 4,
        head: [['Hora', 'Descripción / Motivo del Egreso', 'Método Afectado', 'Monto Restado']],
        body: activeCierre.gastos.map(g => [
          g.fecha ? new Date(g.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--',
          g.motivo || 'Egreso de caja',
          `${g.metodoPago || 'Efectivo'} (${g.categoria || 'Operativo'})`,
          `-$${g.monto.toLocaleString('es-CO')}`
        ]),
        headStyles: { fillColor: [220, 38, 38], fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Clasificación de Productos Vendidos (Pizzas, Parrilla, Bebidas, Otros)
    const isPizza = (nombre: string) => {
      const n = (nombre || '').toLowerCase();
      if (/arepa|hamburguesa|burger|perro|patacon|patacón|empana|salchipapa|desgranado|mazorca|chuzo|alita|costilla/i.test(n)) return false;
      return /pizza/i.test(n);
    };
    const isBebida = (nombre: string) => /gaseosa|coca|postobon|hit|jugo|limonada|agua|cerveza|refresco|soda|malteada|bebida/i.test(nombre);
    const isParrilla = (nombre: string) => !isPizza(nombre) && !isBebida(nombre);

    const prods = activeCierre.productosVendidos || [];
    const pizzas = prods.filter(p => isPizza(p.nombre));
    const bebidas = prods.filter(p => isBebida(p.nombre));
    const parrilla = prods.filter(p => isParrilla(p.nombre));

    doc.setFontSize(13);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen Categorizado de Productos Vendidos', 14, currentY);
    currentY += 5;

    const renderCategoryTable = (title: string, items: any[], color: [number, number, number]) => {
      if (items.length === 0) return;
      const totalCat = items.reduce((sum, i) => sum + i.total, 0);
      const totalQty = items.reduce((sum, i) => sum + i.qty, 0);

      doc.setFontSize(11);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(`${title} (${totalQty} un. - Total: $${totalCat.toLocaleString('es-CO')})`, 14, currentY);

      autoTable(doc, {
        startY: currentY + 3,
        head: [['Producto', 'Unidades Vendidas', 'Ingreso Recaudado']],
        body: items.map(p => [p.nombre, `${p.qty} un.`, `$${p.total.toLocaleString('es-CO')}`]),
        headStyles: { fillColor: color, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    };

    renderCategoryTable('SECCIÓN PIZZAS', pizzas, [220, 38, 38]);
    renderCategoryTable('SECCIÓN PARRILLA / PLATOS', parrilla, [234, 88, 12]);
    renderCategoryTable('SECCIÓN BEBIDAS', bebidas, [37, 99, 235]);

    doc.save(`Cierre_Caja_${activeCierre.fecha}.pdf`);
  }

  exportGeneralToPDF() {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(234, 88, 12); // Orange
    doc.text('Yiyo Burger - Reporte Financiero', 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    let periodText = 'Todo el Historial';
    const type = this.filterType();
    const dateVal = this.selectedDate();
    if (type === 'dia' && dateVal) {
      periodText = `Día: ${dateVal}`;
    } else if (type === 'mes' && dateVal) {
      periodText = `Mes: ${dateVal}`;
    } else if (type === 'ano' && dateVal) {
      periodText = `Año: ${dateVal}`;
    }
    doc.text(`Período de Reporte: ${periodText}`, 14, 28);
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Resumen General', 14, 40);
    
    autoTable(doc, {
      startY: 45,
      head: [['Métrica', 'Valor']],
      body: [
        ['Total Ingreso Bruto', `$${this.totalIncome().toLocaleString()}`],
        ['Total Órdenes', this.totalOrdersCount().toString()],
        ['Ticket Promedio', `$${this.averageTicket().toLocaleString()}`],
        ['Total Ventas Netas', `$${this.totalSubtotal().toLocaleString()}`],
        ['Impuestos Cobrados', `$${this.totalTaxes().toLocaleString()}`],
        ['Propinas Recaudadas', `$${this.totalTips().toLocaleString()}`]
      ],
      headStyles: { fillColor: [55, 65, 81] },
      styles: { fontSize: 11 },
      margin: { top: 10 }
    });

    const metodosData = this.paymentMethodsData().map(m => [m.name, `$${m.value.toLocaleString()}`, `${m.percentage.toFixed(1)}%`]);
    if (metodosData.length > 0) {
      doc.text('Métodos de Pago', 14, (doc as any).lastAutoTable.finalY + 15);
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Método', 'Valor', 'Porcentaje']],
        body: metodosData,
        headStyles: { fillColor: [234, 88, 12] },
        styles: { fontSize: 11 }
      });
    }

    doc.save(`Reporte_Financiero_${new Date().toISOString().split('T')[0]}.pdf`);
  }
}

export default AdminReportesPageComponent;
