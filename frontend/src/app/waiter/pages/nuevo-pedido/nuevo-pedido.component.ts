import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { PlatosService, Plato } from '../../../admin/services/platos.service';
import { MesasService, Mesa } from '../../../admin/services/mesas.service';
import { PedidosService, Order } from '../../../admin/services/pedidos.service';
import { AuthService } from '@auth/services/auth.service';
import { toast } from 'ngx-sonner';

interface OrderItem {
  id: number | string;
  nombre: string;
  precio: number;
  qty: number;
}

interface OrderData {
  mesa: number | string;
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
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './nuevo-pedido.component.html',
})
export class NuevoPedidoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private platosService = inject(PlatosService);
  private mesasService = inject(MesasService);
  private pedidosService = inject(PedidosService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  menu: Plato[] = [];
  filteredMenu: Plato[] = [];
  mesas: Mesa[] = [];
  activeOrders: Order[] = [];
  isSubmitting = false;

  order: OrderData = {
    mesa: '',
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
    mesa: ['', Validators.required],
    cliente: [''],
    notas: [''],
  });

  categories: string[] = [];
  selectedCategory: string = 'Todos';

  ngOnInit() {
    this.loadMenu();
    this.loadMesas();
    this.loadActiveOrders();
    this.loadDraft();

    // Check if table passed as query param: /waiter/nuevo-pedido?mesa=2
    this.route.queryParams.subscribe((params) => {
      if (params['mesa']) {
        this.form.patchValue({ mesa: params['mesa'] });
      }
    });
  }

  loadMenu() {
    this.platosService.getAll().subscribe({
      next: (platos) => {
        this.menu = (platos || []).filter((p) => p.disponible);
        this.extractCategories();
        this.filterMenu();
        this.menu.forEach((p) => this.quantities.set(p.plato_id, 1));
      },
      error: (err) => console.error('Error loading menu:', err),
    });
  }

  extractCategories() {
    const uniqueCategories = new Set(
      this.menu
        .map((p) => p.categoria)
        .filter((c): c is string => !!c),
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
      tempMenu = tempMenu.filter((p) => p.categoria === this.selectedCategory);
    }

    if (this.searchTerm.trim()) {
      tempMenu = tempMenu.filter((m) =>
        (m.nombre + ' ' + (m.descripcion || ''))
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase()),
      );
    }

    this.filteredMenu = tempMenu;
  }

  loadMesas() {
    this.mesasService.getAll(true).subscribe({
      next: (mesas) => {
        this.mesas = mesas || [];
      },
      error: (err) => console.error('Error loading mesas:', err),
    });
  }

  loadActiveOrders() {
    this.pedidosService.getActive(true).subscribe({
      next: (orders) => {
        this.activeOrders = orders || [];
      },
      error: (err) => console.error('Error loading active orders:', err),
    });
  }

  onSearch() {
    this.filterMenu();
  }

  addItem(plato: Plato, qty: number = 1) {
    const existing = this.order.items.find((i) => i.id === plato.plato_id);
    if (existing) {
      existing.qty += qty;
    } else {
      this.order.items.push({
        id: plato.plato_id,
        nombre: plato.nombre,
        precio: Number(plato.precio) || 0,
        qty,
      });
    }
    this.updateTotals();
    this.saveDraft();
    toast.success(`+${qty} ${plato.nombre}`);
  }

  removeItem(id: number | string) {
    this.order.items = this.order.items.filter((i) => i.id !== id);
    this.updateTotals();
    this.saveDraft();
  }

  changeQty(id: number | string, qty: number) {
    const item = this.order.items.find((i) => i.id === id);
    if (item) {
      item.qty = Math.max(1, qty);
      this.updateTotals();
      this.saveDraft();
    }
  }

  updateTotals() {
    this.order.subtotal = this.order.items.reduce(
      (sum, item) => sum + item.precio * item.qty,
      0,
    );
    this.order.tax = 0; // En Colombia el impuesto va incluido en precio o es 0 por defecto
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
      try {
        const draft = JSON.parse(draftStr);
        this.form.patchValue({
          mesa: draft.mesa || '',
          cliente: draft.cliente || '',
          notas: draft.notas || '',
        });
        this.order.items = draft.items || [];
        this.updateTotals();
      } catch (e) {
        console.error('Error reading draftOrder', e);
      }
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

  onQtyChangeOrder(itemId: number | string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.changeQty(itemId, +value);
  }

  hasActiveOrderForTable(tableNumber: string): boolean {
    return this.activeOrders.some(
      (pedido) =>
        String(pedido.mesa).trim() === String(tableNumber).trim() &&
        pedido.tipo === 'Mesa' &&
        pedido.estado !== 'Completado' &&
        pedido.estado !== 'Cancelado',
    );
  }

  registerOrder() {
    if (this.form.invalid) {
      toast.error('Por favor selecciona una mesa.');
      return;
    }
    if (!this.order.items.length) {
      toast.error('Agrega al menos un platillo al pedido.');
      return;
    }

    const mesaVal = String(this.form.value.mesa).trim();
    const clienteVal = this.form.value.cliente?.trim() || 'Cliente Mesa';
    const notasVal = this.form.value.notas?.trim() || '';

    const user = this.authService.user();
    const meseroName = user
      ? `${user.name} ${user.surname || ''}`.trim()
      : 'Mesero';
    const usuarioId = user?.id;

    const formattedItems = this.order.items.map((i) => ({
      id: String(i.id),
      nombre: i.nombre,
      precio: i.precio,
      qty: i.qty,
      categoria: '',
      tipoEntrega: 'mesa',
      notas: '',
    }));

    // Verificar si la mesa ya tiene un pedido activo para adicionarle platos
    const existingOrder = this.activeOrders.find(
      (o) =>
        String(o.mesa).trim() === mesaVal &&
        o.tipo === 'Mesa' &&
        o.estado !== 'Completado' &&
        o.estado !== 'Cancelado',
    );

    this.isSubmitting = true;

    if (existingOrder) {
      // ADICIÓN DE PLATOS AL PEDIDO EXISTENTE
      const mergedItems = [...(existingOrder.items || []), ...formattedItems];
      const newSubtotal = (existingOrder.subtotal || 0) + this.order.subtotal;
      const newTotal = (existingOrder.total || 0) + this.order.total;

      const updatePayload: any = {
        items: mergedItems,
        subtotal: newSubtotal,
        total: newTotal,
        notas: (existingOrder.notas ? existingOrder.notas + ' | ' : '') + (notasVal ? 'Adición: ' + notasVal : ''),
      };

      this.pedidosService.update(existingOrder.id, updatePayload).subscribe({
        next: (updated) => {
          this.isSubmitting = false;
          localStorage.removeItem('draftOrder');

          // Imprimir comanda de adición a cocina
          const mesaObj = this.mesas.find((m) => String(m.numero) === mesaVal);
          const pedidoInfo = {
            id: existingOrder.id,
            orderNumber: existingOrder.orderNumber,
            mesa: `Mesa ${mesaVal}`,
            ubicacion: mesaObj?.ubicacion || 'Salón',
            tipo: 'Mesa',
            esAdicion: true,
            mesero: meseroName,
          };

          this.mesasService.confirmarPedido(pedidoInfo, formattedItems).subscribe({
            next: () => console.log('Comanda de adición enviada a cocina'),
            error: (err) => console.error('Error al enviar comanda:', err),
          });

          toast.success(`✅ Platos añadidos a la Mesa ${mesaVal}!`);
          this.router.navigate(['/waiter/mesas']);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Error actualizando pedido existente:', err);
          toast.error(err.error?.message || 'Error al agregar platos al pedido existente.');
        },
      });
      return;
    }

    // NUEVO PEDIDO
    const payload: any = {
      tipo: 'Mesa',
      mesa: mesaVal,
      cliente_nombre: clienteVal,
      notas: notasVal,
      estado: 'Recibido',
      mesero: meseroName,
      usuario_id: usuarioId,
      subtotal: this.order.subtotal,
      impuesto_valor: 0,
      propina_valor: 0,
      total: this.order.total,
      items: formattedItems,
    };

    this.pedidosService.createPedido(payload).subscribe({
      next: (createdOrder: any) => {
        this.isSubmitting = false;
        localStorage.removeItem('draftOrder');

        // Actualizar la mesa a ocupada en base de datos
        const mesaObj = this.mesas.find((m) => String(m.numero) === mesaVal);
        if (mesaObj) {
          this.mesasService.cambiarEstado(mesaObj.mesa_id, 'ocupada').subscribe({
            next: () => console.log(`Mesa ${mesaVal} marcada como ocupada`),
            error: (err) => console.error('Error al cambiar estado de mesa:', err),
          });
        }

        // Imprimir comanda a cocina
        const pedidoInfo = {
          id: createdOrder.id,
          orderNumber: createdOrder.orderNumber,
          mesa: `Mesa ${mesaVal}`,
          ubicacion: mesaObj?.ubicacion || 'Salón',
          tipo: 'Mesa',
          esAdicion: false,
          mesero: meseroName,
        };

        this.mesasService.confirmarPedido(pedidoInfo, formattedItems).subscribe({
          next: () => console.log('Comanda enviada a cocina'),
          error: (err) => console.error('Error al enviar comanda:', err),
        });

        toast.success(`🎉 Pedido registrado para la Mesa ${mesaVal}!`);
        this.router.navigate(['/waiter/mesas']);
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Error creando pedido:', err);
        toast.error(err.error?.message || 'Error al registrar el pedido en el servidor.');
      },
    });
  }
}

export default NuevoPedidoComponent;
