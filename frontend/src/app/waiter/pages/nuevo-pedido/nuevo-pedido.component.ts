import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { PlatosService, Plato } from '../../../admin/services/platos.service';
import { MesasService, Mesa } from '../../../admin/services/mesas.service';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import jsPDF from 'jspdf';

interface OrderItem {
  id: number;
  nombre: string;
  precio: number;
  qty: number;
}

interface Order {
  mesa: number;
  cliente: string;
  notas: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
}

@Component({
  selector: 'app-nuevo-pedido',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, CurrencyPipe],
  templateUrl: './nuevo-pedido.component.html',
})
export class NuevoPedidoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private platosService = inject(PlatosService);
  private mesasService = inject(MesasService);
  private router = inject(Router);

  menu: Plato[] = [];
  filteredMenu: Plato[] = [];
  mesas: Mesa[] = [];
  order: Order = {
    mesa: 0,
    cliente: '',
    notas: '',
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
  };
  searchTerm = '';
  quantities = new Map<number, number>();

  form: FormGroup = this.fb.group({
    mesa: [null, Validators.required],
    cliente: [''],
    notas: [''],
  });

  categories: string[] = [];
  selectedCategory: string = 'Todos';

  ngOnInit() {
    this.loadMenu();
    this.loadMesas();
    this.loadDraft();
  }

  loadMenu() {
    this.platosService.getAll().subscribe({
      next: (platos) => {
        this.menu = platos.filter(p => p.disponible);
        this.extractCategories();
        this.filterMenu();
        this.menu.forEach(p => this.quantities.set(p.plato_id, 1));
      },
      error: (err) => console.error('Error loading menu:', err)
    });
  }

  extractCategories() {
    const uniqueCategories = new Set(
      this.menu
        .map(p => p.categoria)
        .filter((c): c is string => !!c)
    );
    this.categories = ['Todos', ...Array.from(uniqueCategories)];
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
    this.filterMenu();
  }

  filterMenu() {
    let tempMenu = this.menu;

    if (this.selectedCategory !== 'Todos') {
      tempMenu = tempMenu.filter(p => p.categoria === this.selectedCategory);
    }

    if (this.searchTerm.trim()) {
      tempMenu = tempMenu.filter(m =>
        (m.nombre + ' ' + (m.descripcion || '')).toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    this.filteredMenu = tempMenu;
  }

  loadMesas() {
    this.mesasService.getAll().subscribe({
      next: (mesas) => {
        this.mesas = mesas;
      },
      error: (err) => console.error('Error loading mesas:', err)
    });
  }

  onSearch() {
    this.filterMenu();
  }

  addItem(plato: Plato, qty: number = 1) {
    const existing = this.order.items.find(i => i.id === plato.plato_id);
    if (existing) {
      existing.qty += qty;
    } else {
      this.order.items.push({
        id: plato.plato_id,
        nombre: plato.nombre,
        precio: plato.precio,
        qty,
      });
    }
    this.updateTotals();
    this.saveDraft();
  }

  removeItem(id: number) {
    this.order.items = this.order.items.filter(i => i.id !== id);
    this.updateTotals();
    this.saveDraft();
  }

  changeQty(id: number, qty: number) {
    const item = this.order.items.find(i => i.id === id);
    if (item) {
      item.qty = Math.max(1, qty);
      this.updateTotals();
      this.saveDraft();
    }
  }

  updateTotals() {
    this.order.subtotal = this.order.items.reduce((sum, item) => sum + item.precio * item.qty, 0);
    this.order.tax = this.order.subtotal * 0.1;
    this.order.total = this.order.subtotal + this.order.tax;
  }

  saveDraft() {
    const draft = {
      ...this.form.value,
      items: this.order.items,
      subtotal: this.order.subtotal,
      tax: this.order.tax,
      total: this.order.total,
    };
    localStorage.setItem('draftOrder', JSON.stringify(draft));
  }

  loadDraft() {
    const draftStr = localStorage.getItem('draftOrder');
    if (draftStr) {
      const draft = JSON.parse(draftStr);
      this.form.patchValue({
        mesa: draft.mesa || '',
        cliente: draft.cliente || '',
        notas: draft.notas || '',
      });
      this.order.items = draft.items || [];
      this.updateTotals();
    }
  }

  clearDraft() {
    if (confirm('¿Limpiar el pedido actual?')) {
      this.order.items = [];
      this.form.reset();
      localStorage.removeItem('draftOrder');
      this.updateTotals();
    }
  }

  onQtyChange(platoId: number, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.quantities.set(platoId, +value);
  }

  onQtyChangeOrder(itemId: number, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.changeQty(itemId, +value);
  }

  printReceipt() {
    if (!this.order.items.length) {
      alert('No hay items en el pedido.');
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Comprobante de Pago', 20, 20);
    doc.setFontSize(12);
    doc.text(`Mesa: ${this.form.value.mesa}`, 20, 40);
    doc.text(`Cliente: ${this.form.value.cliente || 'N/A'}`, 20, 50);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 20, 60);

    let y = 80;
    doc.text('Items:', 20, y);
    y += 10;
    this.order.items.forEach(item => {
      doc.text(`${item.nombre} x${item.qty} - $${(item.precio * item.qty).toFixed(2)}`, 20, y);
      y += 10;
    });

    y += 10;
    doc.text(`Subtotal: $${this.order.subtotal.toFixed(2)}`, 20, y);
    y += 10;
    doc.text(`Impuesto (10%): $${this.order.tax.toFixed(2)}`, 20, y);
    y += 10;
    doc.text(`Total: $${this.order.total.toFixed(2)}`, 20, y);

    doc.save('comprobante.pdf');
  }

  hasActiveOrderForTable(tableNumber: string): boolean {
    const pedidos = JSON.parse(localStorage.getItem('pedidos') || '[]');
    return pedidos.some((pedido: any) =>
      pedido.mesa === tableNumber &&
      pedido.estado !== 'Completado' &&
      pedido.estado !== 'Cancelado'
    );
  }

  registerOrder() {
    if (this.form.invalid) {
      alert('Selecciona una mesa.');
      return;
    }
    if (!this.order.items.length) {
      alert('Agrega al menos un platillo.');
      return;
    }

    // Check if table already has an active order
    if (this.hasActiveOrderForTable(this.form.value.mesa)) {
      alert('Esta mesa ya tiene un pedido activo. No se pueden crear pedidos duplicados.');
      return;
    }

    // For now, save to localStorage
    const pedidos = JSON.parse(localStorage.getItem('pedidos') || '[]');
    const id = 'P' + String(Date.now()).slice(-6);
    const newOrder = {
      id,
      ...this.form.value,
      items: this.order.items,
      subtotal: this.order.subtotal,
      tax: this.order.tax,
      total: this.order.total,
      estado: 'Recibido',
      fecha: new Date().toISOString(),
    };
    pedidos.push(newOrder);
    localStorage.setItem('pedidos', JSON.stringify(pedidos));
    localStorage.removeItem('draftOrder');
    alert('Pedido registrado: ' + id);
    // Navigate to pedidos page
    this.router.navigate(['/waiter/pedidos']);
  }
}

export default NuevoPedidoComponent;
