import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MesasService, Mesa } from '../../../admin/services/mesas.service';
import { CurrencyPipe, DatePipe } from '@angular/common';

interface Order {
  id: string;
  mesa: string;
  cliente?: string;
  notas?: string;
  items: any[];
  subtotal: number;
  tax: number;
  total: number;
  estado: string;
  fecha: string;
  showDetails?: boolean; // For UI expansion
}

interface DashboardMetrics {
  activeOrders: number;
  occupiedTables: number;
  completedOrders: number;
  dailyRevenue: number;
}

@Component({
  selector: 'waiter-dashboard-page',
  imports: [CommonModule, RouterLink, FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './waiter-dashboard-page.component.html',
  styles: ``,
})
export class WaiterDashboardPageComponent implements OnInit, OnDestroy {
  private mesasService = inject(MesasService);
  private cdr = inject(ChangeDetectorRef);

  metrics: DashboardMetrics = {
    activeOrders: 0,
    occupiedTables: 0,
    completedOrders: 0,
    dailyRevenue: 0,
  };

  mesas: Mesa[] = [];
  recentOrders: Order[] = [];
  orderHistory: Order[] = [];
  filteredOrderHistory: Order[] = [];

  // Filter properties
  dateFilter: string = '';
  tableFilter: string = '';
  customerFilter: string = '';
  statusFilter: string = '';

  private refreshInterval?: number;

  ngOnInit() {
    console.log('👨‍🍳 Dashboard del Mesero cargado correctamente');
    this.loadData();

    // Auto-refresh every 30 seconds
    this.refreshInterval = window.setInterval(() => {
      this.loadData();
    }, 30000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  loadData() {
    this.loadMesas();
    this.loadOrders();
    this.calculateMetrics();
  }

  loadMesas() {
    console.log('Loading mesas for dashboard...');
    this.mesasService.getAll().subscribe({
      next: (mesas) => {
        this.mesas = mesas;
        this.calculateMetrics();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading mesas:', err);
        // Load mock data for development
        this.mesas = [
          { mesa_id: 1, numero: 1, capacidad: 4, estado: 'libre', created_at: new Date().toISOString() },
          { mesa_id: 2, numero: 2, capacidad: 4, estado: 'ocupada', created_at: new Date().toISOString() },
          { mesa_id: 3, numero: 3, capacidad: 6, estado: 'libre', created_at: new Date().toISOString() },
          { mesa_id: 4, numero: 4, capacidad: 2, estado: 'reservada', created_at: new Date().toISOString() },
        ];
        this.calculateMetrics();
        this.cdr.detectChanges();
      }
    });
  }

  loadOrders() {
    const pedidos = JSON.parse(localStorage.getItem('pedidos') || '[]');
    // Get last 10 orders for recent orders section
    this.recentOrders = pedidos.slice(-10).reverse();
    // Load all orders for history
    this.orderHistory = pedidos.reverse();
    this.applyFilters();
    this.calculateMetrics();
    this.cdr.detectChanges();
  }

  calculateMetrics() {
    const pedidos = JSON.parse(localStorage.getItem('pedidos') || '[]');

    // Active orders (not completed or cancelled)
    this.metrics.activeOrders = pedidos.filter((p: Order) =>
      p.estado !== 'Completado' && p.estado !== 'Cancelado'
    ).length;

    // Occupied tables: tables with active orders OR in 'ocupada'/'reservada' status
    const occupiedByOrders = this.mesas.filter(mesa =>
      this.recentOrders.some(order =>
        parseInt(order.mesa) === mesa.numero &&
        order.estado !== 'Completado' &&
        order.estado !== 'Cancelado'
      )
    ).length;

    const occupiedByStatus = this.mesas.filter(m =>
      m.estado === 'ocupada' || m.estado === 'reservada'
    ).length;

    // Use the higher count to ensure all occupied tables are counted
    this.metrics.occupiedTables = Math.max(occupiedByOrders, occupiedByStatus);

    // Completed orders today
    const today = new Date().toDateString();
    this.metrics.completedOrders = pedidos.filter((p: Order) => {
      const orderDate = new Date(p.fecha).toDateString();
      return orderDate === today && p.estado === 'Completado';
    }).length;

    // Daily revenue
    this.metrics.dailyRevenue = pedidos
      .filter((p: Order) => {
        const orderDate = new Date(p.fecha).toDateString();
        return orderDate === today;
      })
      .reduce((sum: number, p: Order) => sum + p.total, 0);
  }

  refreshData() {
    this.loadData();
  }

  getOrderForTable(mesaNumero: number): Order | undefined {
    return this.recentOrders.find(o => parseInt(o.mesa) === mesaNumero);
  }

  getMesaStatusClass(mesa: Mesa): string {
    const baseClass = 'bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition-all duration-200';
    switch (mesa.estado) {
      case 'ocupada':
        return baseClass + ' border-l-4 border-red-500 bg-red-900/20';
      case 'reservada':
        return baseClass + ' border-l-4 border-yellow-500 bg-yellow-900/20';
      case 'mantenimiento':
        return baseClass + ' border-l-4 border-gray-500 bg-gray-900/20';
      default:
        return baseClass + ' border-l-4 border-green-500 bg-green-900/20';
    }
  }

  getMesaStatusText(mesa: Mesa): string {
    switch (mesa.estado) {
      case 'libre':
        return 'Libre';
      case 'ocupada':
        return 'Ocupada';
      case 'reservada':
        return 'Reservada';
      case 'mantenimiento':
        return 'Mantenimiento';
      default:
        return mesa.estado;
    }
  }

  getMesaStatusTextClass(mesa: Mesa): string {
    switch (mesa.estado) {
      case 'libre':
        return 'text-green-400';
      case 'ocupada':
        return 'text-red-400';
      case 'reservada':
        return 'text-yellow-400';
      case 'mantenimiento':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  }

  getOrderStatusClass(estado: string): string {
    switch (estado) {
      case 'Recibido':
        return 'text-blue-400';
      case 'En preparación':
        return 'text-yellow-400';
      case 'Listo':
        return 'text-green-400';
      case 'Completado':
        return 'text-green-600';
      case 'Cancelado':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  }

  // Order History Methods
  applyFilters() {
    let filtered = [...this.orderHistory];

    if (this.dateFilter) {
      const filterDate = new Date(this.dateFilter).toDateString();
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.fecha).toDateString();
        return orderDate === filterDate;
      });
    }

    if (this.tableFilter) {
      filtered = filtered.filter(order => order.mesa === this.tableFilter);
    }

    if (this.customerFilter.trim()) {
      const searchTerm = this.customerFilter.toLowerCase();
      filtered = filtered.filter(order =>
        order.cliente && order.cliente.toLowerCase().includes(searchTerm)
      );
    }

    if (this.statusFilter) {
      filtered = filtered.filter(order => order.estado === this.statusFilter);
    }

    this.filteredOrderHistory = filtered;
  }

  clearFilters() {
    this.dateFilter = '';
    this.tableFilter = '';
    this.customerFilter = '';
    this.statusFilter = '';
    this.applyFilters();
  }

  toggleOrderDetails(order: Order) {
    order.showDetails = !order.showDetails;
  }
}

export default WaiterDashboardPageComponent;
