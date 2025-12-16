import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PlatosService, Plato } from '../../../admin/services/platos.service';
import jsPDF from 'jspdf';

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
  selector: 'waiter-pedidos-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './waiter-pedidos-page.component.html',
  styles: ``,
})
export class WaiterPedidosPageComponent implements OnInit {
  private platosService = inject(PlatosService);
  orders: Order[] = [];
  menu: Plato[] = [];
  showModal = false;
  showEditModal = false;
  selectedOrder: Order | null = null;
  editingOrder: Order | null = null;

  ngOnInit() {
    console.log('📋 Componente de Pedidos del Mesero cargado correctamente');
    this.loadOrders();
    this.loadMenu();
  }

  /**
   * Carga los pedidos desde localStorage
   */
  loadOrders() {
    const pedidos = JSON.parse(localStorage.getItem('pedidos') || '[]');
    this.orders = pedidos.reverse(); // Mostrar los más recientes primero
  }

  /**
   * Carga el menú de platos
   */
  loadMenu() {
    this.platosService.getAll().subscribe({
      next: (platos) => {
        this.menu = platos.filter(p => p.disponible);
      },
      error: (err) => {
        console.error('Error loading menu:', err);
        // For development, load some mock dishes
        this.menu = [
          { plato_id: 1, nombre: 'Hamburguesa', descripcion: 'Deliciosa hamburguesa con queso', precio: 25000, disponible: true, imagen_url: '', categoria: 'Principales', created_at: new Date().toISOString() },
          { plato_id: 2, nombre: 'Pizza Margherita', descripcion: 'Pizza clásica con tomate y mozzarella', precio: 30000, disponible: true, imagen_url: '', categoria: 'Principales', created_at: new Date().toISOString() },
          { plato_id: 3, nombre: 'Ensalada César', descripcion: 'Ensalada fresca con aderezo césar', precio: 18000, disponible: true, imagen_url: '', categoria: 'Ensaladas', created_at: new Date().toISOString() },
        ];
      }
    });
  }

  /**
   * Vista rápida del pedido - abre modal
   */
  viewOrder(order: Order) {
    this.selectedOrder = order;
    this.showModal = true;
  }

  /**
   * Editar pedido - abre modal de edición
   */
  editOrder(order: Order) {
    this.editingOrder = { ...order }; // Crear copia para editar
    this.showEditModal = true;
  }

  /**
   * Cerrar modal
   */
  closeModal() {
    this.showModal = false;
    this.selectedOrder = null;
  }

  /**
   * Cerrar modal de edición
   */
  closeEditModal() {
    this.showEditModal = false;
    this.editingOrder = null;
  }

  /**
   * Disminuir cantidad de un item
   */
  decreaseItemQty(index: number) {
    if (this.editingOrder && this.editingOrder.items[index].qty > 1) {
      this.editingOrder.items[index].qty--;
      this.updateOrderTotals();
    }
  }

  /**
   * Aumentar cantidad de un item
   */
  increaseItemQty(index: number) {
    if (this.editingOrder) {
      this.editingOrder.items[index].qty++;
      this.updateOrderTotals();
    }
  }

  /**
   * Eliminar un item del pedido
   */
  removeItem(index: number) {
    if (this.editingOrder && this.editingOrder.items.length > 1) {
      this.editingOrder.items.splice(index, 1);
      this.updateOrderTotals();
    } else {
      alert('El pedido debe tener al menos un artículo.');
    }
  }

  /**
   * Actualizar totales del pedido
   */
  updateOrderTotals() {
    if (this.editingOrder) {
      this.editingOrder.subtotal = this.editingOrder.items.reduce((sum, item) => sum + item.precio * item.qty, 0);
      this.editingOrder.tax = this.editingOrder.subtotal * 0.1;
      this.editingOrder.total = this.editingOrder.subtotal + this.editingOrder.tax;
    }
  }

  /**
   * Agregar un plato al pedido
   */
  addDishToOrder(plato: Plato) {
    if (this.editingOrder) {
      // Check if dish is already in the order
      const existingItem = this.editingOrder.items.find(item => item.id === plato.plato_id);
      if (existingItem) {
        existingItem.qty++;
      } else {
        this.editingOrder.items.push({
          id: plato.plato_id,
          nombre: plato.nombre,
          precio: plato.precio,
          qty: 1
        });
      }
      this.updateOrderTotals();
    }
  }

  /**
   * Guardar cambios del pedido editado
   */
  saveOrderChanges() {
    if (this.editingOrder) {
      // Actualizar el pedido en localStorage
      const pedidos = JSON.parse(localStorage.getItem('pedidos') || '[]');
      const index = pedidos.findIndex((p: Order) => p.id === this.editingOrder!.id);
      if (index !== -1) {
        pedidos[index] = { ...this.editingOrder };
        localStorage.setItem('pedidos', JSON.stringify(pedidos));
        this.loadOrders(); // Recargar pedidos
        this.closeEditModal();
        alert('Pedido actualizado exitosamente.');
      }
    }
  }

  /**
   * Eliminar pedido
   */
  deleteOrder(orderId: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este pedido?')) {
      const pedidos = JSON.parse(localStorage.getItem('pedidos') || '[]');
      const updatedPedidos = pedidos.filter((p: Order) => p.id !== orderId);
      localStorage.setItem('pedidos', JSON.stringify(updatedPedidos));
      this.loadOrders(); // Refrescar lista
    }
  }

  /**
   * Generar comprobante de pago
   */
  printReceipt(order: Order) {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Comprobante de Pago', 20, 20);
    doc.setFontSize(12);
    doc.text(`Pedido: ${order.id}`, 20, 40);
    doc.text(`Mesa: ${order.mesa}`, 20, 50);
    doc.text(`Cliente: ${order.cliente || 'N/A'}`, 20, 60);
    doc.text(`Fecha: ${new Date(order.fecha).toLocaleString()}`, 20, 70);

    let y = 90;
    doc.text('Items:', 20, y);
    y += 10;
    order.items.forEach(item => {
      doc.text(`${item.nombre} x${item.qty} - $${(item.precio * item.qty).toFixed(2)}`, 20, y);
      y += 10;
    });

    y += 10;
    doc.text(`Subtotal: $${order.subtotal.toFixed(2)}`, 20, y);
    y += 10;
    doc.text(`Impuesto (10%): $${order.tax.toFixed(2)}`, 20, y);
    y += 10;
    doc.text(`Total: $${order.total.toFixed(2)}`, 20, y);

    doc.save(`comprobante-${order.id}.pdf`);
  }

  /**
   * Método para futuras funcionalidades del componente de pedidos
   */
  gestionarPedidos() {
    console.log('🍽️ Gestionando pedidos desde Angular...');
    this.loadOrders(); // Refrescar lista
  }
}

export default WaiterPedidosPageComponent;
