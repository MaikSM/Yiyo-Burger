import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MesasService, Mesa } from '../../../admin/services/mesas.service';

interface MesaWithCliente extends Mesa {
  cliente?: string;
}

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
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'waiter-mesas-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './waiter-mesas-page.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaiterMesasPageComponent implements OnInit, OnDestroy {
  private mesasService = inject(MesasService);
  private cdr = inject(ChangeDetectorRef);
  mesas: MesaWithCliente[] = [];
  orders: Order[] = [];
  private refreshInterval?: number;

  ngOnInit() {
    this.loadMesas();
    this.loadOrders();
    // Auto-refresh every 30 seconds
    this.refreshInterval = window.setInterval(() => {
      this.loadMesas();
      this.loadOrders();
    }, 30000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  loadMesas() {
    console.log('Loading mesas...');
    this.mesasService.getAll().subscribe({
      next: (mesas) => {
        console.log('Mesas loaded:', mesas);
        this.mesas = mesas.map(mesa => ({ ...mesa, cliente: '' })); // Initialize cliente field
        this.matchOrdersToTables();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading mesas:', err);
        // For development, load some mock data if API fails
        this.loadMockMesas();
      }
    });
  }

  loadMockMesas() {
    console.log('Loading mock mesas for development');
    this.mesas = [
      { mesa_id: 1, numero: 1, capacidad: 4, estado: 'libre', created_at: new Date().toISOString(), cliente: '' },
      { mesa_id: 2, numero: 2, capacidad: 4, estado: 'libre', created_at: new Date().toISOString(), cliente: '' },
      { mesa_id: 3, numero: 3, capacidad: 6, estado: 'libre', created_at: new Date().toISOString(), cliente: '' },
      { mesa_id: 4, numero: 4, capacidad: 2, estado: 'libre', created_at: new Date().toISOString(), cliente: '' },
    ];
    this.matchOrdersToTables();
    this.cdr.detectChanges();
  }

  loadOrders() {
    const pedidos = JSON.parse(localStorage.getItem('pedidos') || '[]');
    this.orders = pedidos;
    this.matchOrdersToTables();
  }

  matchOrdersToTables() {
    if (this.mesas.length && this.orders.length) {
      this.mesas.forEach(mesa => {
        const order = this.orders.find(o => parseInt(o.mesa) === mesa.numero);
        if (order) {
          mesa.cliente = order.cliente;
          // Automatically set table to occupied if there's an active order
          if (order.estado !== 'Completado' && order.estado !== 'Cancelado') {
            mesa.estado = 'ocupada';
          }
          // You could add more order info to the mesa object if needed
        }
      });
    }
  }

  getOrderForTable(mesaNumero: number): Order | undefined {
    return this.orders.find(o => parseInt(o.mesa) === mesaNumero);
  }

  updateMesaEstado(mesa: MesaWithCliente) {
    // In a real app, this would call an API to update the mesa status
    console.log('Updating mesa status:', mesa);
    // For now, we'll just update the local array
    // In production, you'd call this.mesasService.update(mesa.mesa_id, { estado: mesa.estado })
  }

  updateMesaCliente(mesa: MesaWithCliente) {
    // In a real app, this would call an API to assign a customer to the mesa
    console.log('Assigning customer to mesa:', mesa);
    // For now, we'll just update the local array
    // In production, you'd call this.mesasService.update(mesa.mesa_id, { cliente: mesa.cliente })
  }

  getMesaCardClasses(mesa: MesaWithCliente): string {
    const baseClasses = 'bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group';
    switch (mesa.estado) {
      case 'libre':
        return baseClasses + ' border-l-4 border-green-500';
      case 'ocupada':
        return baseClasses + ' border-l-4 border-red-500';
      case 'reservada':
        return baseClasses + ' border-l-4 border-yellow-500';
      case 'mantenimiento':
        return baseClasses + ' border-l-4 border-gray-500';
      default:
        return baseClasses;
    }
  }

  getStatusClasses(estado: string): string {
    switch (estado) {
      case 'libre':
        return 'bg-green-500/20 text-green-400';
      case 'ocupada':
        return 'bg-red-500/20 text-red-400';
      case 'reservada':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'mantenimiento':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  }

  getStatusLabel(estado: string): string {
    switch (estado) {
      case 'libre':
        return 'Disponible';
      case 'ocupada':
        return 'Ocupada';
      case 'reservada':
        return 'Reservada';
      case 'mantenimiento':
        return 'Mantenimiento';
      default:
        return estado;
    }
  }
}

export default WaiterMesasPageComponent;
