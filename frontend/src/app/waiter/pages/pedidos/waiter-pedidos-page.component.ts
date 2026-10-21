import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PedidosService, Order } from '../../../admin/services/pedidos.service';
import { AuthService } from '@auth/services/auth.service';
import jsPDF from 'jspdf';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'waiter-pedidos-page',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './waiter-pedidos-page.component.html',
  styles: ``,
})
export class WaiterPedidosPageComponent implements OnInit {
  private pedidosService = inject(PedidosService);
  public authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  orders: Order[] = [];
  filteredOrders: Order[] = [];
  selectedOrder: Order | null = null;
  showModal = false;
  isLoading = false;

  filtroEstado: 'todos' | 'activos' | 'completados' = 'todos';
  filtroFecha: string = '';

  ngOnInit() {
    this.loadMyOrders();
  }

  loadMyOrders() {
    this.isLoading = true;
    const user = this.authService.user();
    const userId = user?.id;
    const meseroName = user
      ? `${user.name} ${user.surname || ''}`.trim().toLowerCase()
      : '';

    this.pedidosService.getAll({ all: true, usuario_id: userId }).subscribe({
      next: (allOrders) => {
        // Filtrar pedidos que correspondan a este mesero (por usuario_id o por coincidencia en mesero)
        const myOrders = (allOrders || []).filter((o) => {
          if (userId && o.usuario_id && Number(o.usuario_id) === Number(userId)) {
            return true;
          }
          if (meseroName && o.mesero) {
            return o.mesero.toLowerCase().includes(meseroName);
          }
          return false;
        });

        // Ordenar los más recientes primero
        myOrders.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        this.orders = myOrders;
        this.applyFilter();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando historial de pedidos:', err);
        this.isLoading = false;
        toast.error('Error al cargar historial de pedidos.');
        this.cdr.detectChanges();
      },
    });
  }

  applyFilter() {
    let list = [...this.orders];

    if (this.filtroEstado === 'activos') {
      list = list.filter(
        (o) => o.estado !== 'Completado' && o.estado !== 'Cancelado',
      );
    } else if (this.filtroEstado === 'completados') {
      list = list.filter((o) => o.estado === 'Completado');
    }

    if (this.filtroFecha) {
      list = list.filter((o) => {
        const orderDate = (o.fecha || '').split('T')[0];
        return orderDate === this.filtroFecha;
      });
    }

    this.filteredOrders = list;
  }

  setFiltroEstado(estado: 'todos' | 'activos' | 'completados') {
    this.filtroEstado = estado;
    this.applyFilter();
  }

  get totalVendido(): number {
    return this.orders
      .filter((o) => o.estado === 'Completado')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }

  get pedidosActivosCount(): number {
    return this.orders.filter(
      (o) => o.estado !== 'Completado' && o.estado !== 'Cancelado',
    ).length;
  }

  get pedidosHoyCount(): number {
    const today = new Date().toISOString().split('T')[0];
    return this.orders.filter((o) => (o.fecha || '').startsWith(today)).length;
  }

  viewOrder(order: Order) {
    this.selectedOrder = order;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedOrder = null;
  }

  printReceipt(order: Order) {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('RestauSync POS - Comprobante', 20, 20);
      doc.setFontSize(11);
      doc.text(`Pedido: #${order.orderNumber || order.id}`, 20, 32);
      doc.text(`Mesa: ${order.mesa || 'N/A'}`, 20, 40);
      doc.text(`Cliente: ${order.cliente_nombre || 'Cliente Mesa'}`, 20, 48);
      doc.text(`Atendido por: ${order.mesero || 'Mesero'}`, 20, 56);
      doc.text(`Fecha: ${new Date(order.fecha).toLocaleString()}`, 20, 64);

      let y = 78;
      doc.setFontSize(12);
      doc.text('Items:', 20, y);
      y += 8;

      doc.setFontSize(10);
      (order.items || []).forEach((item) => {
        doc.text(
          `${item.nombre} x${item.qty} - $${((Number(item.precio) || 0) * item.qty).toLocaleString()}`,
          20,
          y,
        );
        y += 7;
      });

      y += 6;
      doc.setFontSize(11);
      doc.text(`Subtotal: $${(Number(order.subtotal) || 0).toLocaleString()}`, 20, y);
      y += 7;
      doc.text(`Total: $${(Number(order.total) || 0).toLocaleString()}`, 20, y);

      doc.save(`pedido-${order.orderNumber || order.id}.pdf`);
      toast.success('Comprobante descargado');
    } catch (e) {
      console.error('Error generando PDF:', e);
      toast.error('Error al generar PDF');
    }
  }
}

export default WaiterPedidosPageComponent;
