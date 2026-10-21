import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { MesasService } from '@admin/services/mesas.service';
import { PlatosService, Plato } from '@admin/services/platos.service';
import { CategoriasService, Categoria } from '@admin/services/categorias.service';
import { ClientesService, Cliente } from '@admin/services/clientes.service';
import { UsersService } from '@admin/services/users.service';
import { PedidosService } from '@admin/services/pedidos.service';
import { BarriosService, BarrioTarifa } from '@admin/services/barrios.service';
import { CierreCajaService } from '@admin/services/cierre-caja.service';
import { AuthService } from '@auth/services/auth.service';
import { iUser } from '@auth/interfaces';
import { firstValueFrom, Subscription } from 'rxjs';

interface OrderItem {
  id: any;
  nombre: string;
  precio: number;
  qty: number;
  seccion?: string;
  categoria?: string;
  notas?: string;
  observaciones?: string;
  paraLlevar?: boolean;
  tipoEntrega?: 'llevar' | 'mesa';
}

export interface DomicilioBorrador {
  id: string;
  fechaCreacion: string;
  cliente: {
    cliente_nombre: string;
    cliente_telefono: string;
    cliente_direccion: string;
    cliente_barrio?: string;
    domiciliario?: string;
  };
  items: OrderItem[];
  subtotal: number;
  total: number;
}

@Component({
  selector: 'admin-domicilios-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-domicilios-page.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDomiciliosPageComponent implements OnInit, OnDestroy {
  private _mesasService = inject(MesasService);
  private _platosService = inject(PlatosService);
  private _categoriasService = inject(CategoriasService);
  private _clientesService = inject(ClientesService);
  private _usersService = inject(UsersService);
  private _fb = inject(FormBuilder);
  private _pedidosService = inject(PedidosService);
  private _barriosService = inject(BarriosService);
  private _cierreCajaService = inject(CierreCajaService);
  private _authService = inject(AuthService);

  private realTimeSub?: Subscription;
  domiciliarios = signal<iUser[]>([]);

  // Barrios y Tarifas State
  showBarriosModal = signal<boolean>(false);
  barrios = signal<BarrioTarifa[]>([]);
  barrioNombreInput = signal<string>('');
  barrioPrecioInput = signal<number>(0);
  editingBarrioId = signal<string | null>(null);
  barriosSearchTerm = signal<string>('');

  filteredBarrios = computed(() => {
    const term = this.barriosSearchTerm().toLowerCase().trim();
    if (!term) return this.barrios();
    return this.barrios().filter(b => b.nombre.toLowerCase().includes(term));
  });

  // Forms
  clienteForm: FormGroup = this._fb.group({
    cliente_nombre: ['', Validators.required],
    cliente_telefono: ['', Validators.required],
    cliente_direccion: ['', Validators.required],
    cliente_barrio: [''],
    domiciliario: [''],
  });

  isSubmitting = signal(false);
  showForm = signal(false);

  // Delivery State
  domiciliosActivos = signal<any[]>([]);
  showOrderModal = signal(false);
  activeOrderId = signal<string | number | null>(null);
  activeOrderNumber = signal<number | null>(null);
  activeOrderClientData = signal<any | null>(null);
  
  // LocalStorage Drafts State
  private readonly BORRADORES_KEY = 'restausync_domicilios_borradores';
  borradoresList = signal<DomicilioBorrador[]>([]);
  currentDraftId = signal<string | null>(null);
  
  // Despacho State
  showDespachoModal = signal<boolean>(false);
  isCompletingMode = signal<boolean>(false);
  selectedDomicilioDespacho = signal<any | null>(null);
  despachoBarrioSeleccionado = signal<BarrioTarifa | null>(null);
  despachoDomiciliario = signal<string>('');
  despachoMetodoPago = signal<string>('Efectivo');
  despachoImpuestoPct = signal<number>(0);
  despachoEntrega = signal<number>(0);

  despachoSubtotal = computed(() => {
    const domicilio = this.selectedDomicilioDespacho();
    if (!domicilio) return 0;
    let rawItems = domicilio.items;
    if (typeof rawItems === 'string') {
      try { rawItems = JSON.parse(rawItems); } catch(e) { rawItems = []; }
    }
    const items = Array.isArray(rawItems) ? rawItems : [];
    if (items.length > 0) {
      return items.reduce((s: number, i: any) => s + (Number(i.precio) || 0) * (Number(i.qty) || 1), 0);
    }
    return Number(domicilio.subtotal) || Number(domicilio.total) || 0;
  });

  despachoTarifaDomicilio = computed(() => {
    return Number(this.despachoBarrioSeleccionado()?.precio) || 0;
  });

  despachoImpuestoMonto = computed(() => {
    return this.despachoSubtotal() * (this.despachoImpuestoPct() / 100);
  });

  despachoTotal = computed(() => {
    return this.despachoSubtotal() + this.despachoImpuestoMonto() + this.despachoTarifaDomicilio();
  });

  despachoVuelto = computed(() => {
    const entrega = Number(this.despachoEntrega()) || 0;
    const total = this.despachoTotal();
    return entrega > total ? entrega - total : 0;
  });

  getDomicilioTotalConEnvio(domicilio: any): number {
    if (!domicilio) return 0;
    const subtotal = Number(domicilio.subtotal) || Number(domicilio.total) || 0;
    const currentTotal = Number(domicilio.total) || 0;

    if (currentTotal > subtotal) {
      return currentTotal;
    }

    const barrioNombre = (domicilio.cliente_barrio || domicilio.barrio || '').toLowerCase().trim();
    if (barrioNombre) {
      const foundBarrio = this.barrios().find(b => b.nombre.toLowerCase().trim() === barrioNombre);
      if (foundBarrio && Number(foundBarrio.precio) > 0) {
        return subtotal + Number(foundBarrio.precio);
      }
    }

    return currentTotal || subtotal;
  }

  getDomicilioCostoEnvio(domicilio: any): number {
    if (!domicilio) return 0;
    if (Number(domicilio.costo_domicilio) > 0) return Number(domicilio.costo_domicilio);
    if (Number(domicilio.tarifa_domicilio) > 0) return Number(domicilio.tarifa_domicilio);

    const barrioModal = this.despachoBarrioSeleccionado();
    if (this.showOrderModal() && barrioModal && Number(barrioModal.precio) > 0) {
      return Number(barrioModal.precio);
    }

    const barrioNombre = (domicilio.cliente_barrio || domicilio.barrio || '').toLowerCase().trim();
    if (barrioNombre) {
      const foundBarrio = this.barrios().find(b => b.nombre.toLowerCase().trim() === barrioNombre);
      if (foundBarrio && Number(foundBarrio.precio) > 0) {
        return Number(foundBarrio.precio);
      }
    }

    const subtotal = Number(domicilio.subtotal) || 0;
    const total = Number(domicilio.total) || 0;
    if (total > subtotal) {
      return total - subtotal;
    }

    return 0;
  }

  getMetodoPagoDisplay(metodo?: string): string {
    const m = (metodo || 'Efectivo').trim();
    switch (m) {
      case 'Efectivo': return '💵 Efectivo';
      case 'Nequi': return '💜 Nequi';
      case 'Daviplata': return '🔴 Daviplata';
      case 'Tarjeta': return '💳 Tarjeta';
      case 'Transferencia': return '🏦 Transferencia';
      case 'Bre-B': return '⚡ Bre-B';
      case 'Bold': return '🟦 Bold';
      case 'Crédito': return '📝 Crédito';
      case 'Pago Mixto': return '🔀 Pago Mixto';
      case 'Otros': return '📦 Otros';
      default: return `💵 ${m}`;
    }
  }

  isMetodoEfectivo(metodo?: string): boolean {
    const m = (metodo || 'Efectivo').trim();
    return m === 'Efectivo' || m === 'Pago Mixto';
  }

  getClientePagaCon(domicilio: any): number {
    if (!domicilio) return 0;
    const entregado = Number(domicilio.monto_entregado);
    if (entregado && entregado > 0) {
      return entregado;
    }
    return this.getDomicilioTotalConEnvio(domicilio);
  }

  getDomicilioVuelto(domicilio: any): number {
    if (!domicilio) return 0;
    if (domicilio.vuelto !== undefined && domicilio.vuelto !== null && Number(domicilio.vuelto) > 0) {
      return Number(domicilio.vuelto);
    }
    const total = this.getDomicilioTotalConEnvio(domicilio);
    const entregado = Number(domicilio.monto_entregado) || 0;
    return (entregado > total) ? (entregado - total) : 0;
  }

  getDineroAEntregar(domicilio: any): number {
    if (!domicilio) return 0;
    const m = (domicilio.metodo_pago || 'Efectivo').trim();
    if (m === 'Pago Mixto' && Array.isArray(domicilio.pagos_mixtos)) {
      const efectivoItem = domicilio.pagos_mixtos.find((p: any) => p.metodo === 'Efectivo');
      return efectivoItem ? Number(efectivoItem.monto) || 0 : 0;
    }
    if (m === 'Efectivo') {
      return this.getDomicilioTotalConEnvio(domicilio);
    }
    return 0;
  }

  showHistoryModal = signal(false);
  orderHistory = signal<any[]>([]);
  historyFilterDate = signal<string>('');
  selectedHistoryOrder = signal<any | null>(null);
  
  menuPlatos = signal<Plato[]>([]);
  todasLasCategorias = signal<Categoria[]>([]);
  categories = signal<string[]>(['Todos']);
  selectedCategory = signal<string>('Todos');
  searchTerm = signal<string>('');
  activeSeccion = signal<'Todos' | 'Parrilla' | 'Pizzas' | 'Bebidas'>('Todos');

  isPizzaPlato(plato: Plato): boolean {
    if (!plato || !plato.categoria) return false;
    const cat = this.todasLasCategorias().find(c => c.nombre === plato.categoria);
    return cat?.seccion === 'Pizzas' || plato.categoria.toLowerCase().includes('pizza');
  }

  get filteredCategories(): string[] {
    const seccion = this.activeSeccion();
    const allCats = this.todasLasCategorias();

    if (seccion === 'Todos') {
      return ['Todos', ...this.categories().filter(c => c !== 'Todos')];
    }

    const isParrilla = seccion === 'Parrilla';
    const isPizzas = seccion === 'Pizzas';
    const isBebidas = seccion === 'Bebidas';
    
    const validCategories = allCats
      .filter(c => isParrilla ? (c.seccion === 'Parrilla' || !c.seccion) : (isPizzas ? c.seccion === 'Pizzas' : c.seccion === 'Bebidas'))
      .map(c => c.nombre);

    return ['Todos', ...this.categories().filter(c => c !== 'Todos' && validCategories.includes(c))];
  }

  get filteredPlatos(): Plato[] {
    const currentCategory = this.selectedCategory();
    const term = this.searchTerm().toLowerCase();
    
    let filtered = this.menuPlatos();
    const validCategoryNames = this.filteredCategories;
    
    if (currentCategory !== 'Todos') {
      filtered = filtered.filter(p => p.categoria === currentCategory);
    } else if (this.activeSeccion() !== 'Todos') {
      filtered = filtered.filter(p => p.categoria && validCategoryNames.includes(p.categoria));
    }
    
    if (term) {
      filtered = filtered.filter(p => p.nombre.toLowerCase().includes(term));
    }
    
    return filtered;
  }
  
  orderItems = signal<OrderItem[]>([]);
  originalOrderItems = signal<OrderItem[]>([]);
  orderSubtotal = signal(0);
  orderTax = signal(0);
  orderTotal = signal(0);

  // Pizza customization state
  showHalfAndHalfModal = signal(false);
  selectedHalfSize = signal<string>('Grande');
  selectedFlavor1 = signal<Plato | null>(null);
  selectedFlavor2 = signal<Plato | null>(null);

  allPizzas = computed(() => {
    return this.menuPlatos().filter(p => {
      const cat = this.todasLasCategorias().find(c => c.nombre === p.categoria);
      return cat?.seccion === 'Pizzas' || p.categoria?.toLowerCase().includes('pizza');
    });
  });

  halfAndHalfPrice = computed(() => {
    const f1 = this.selectedFlavor1();
    const f2 = this.selectedFlavor2();
    const size = this.selectedHalfSize();
    if (!f1 || !f2) return 0;
    const p1 = this.getPizzaPrice(f1, size);
    const p2 = this.getPizzaPrice(f2, size);
    return Math.max(p1, p2);
  });

  // Checkout State
  showCheckoutModal = signal(false);
  checkoutMetodoPago = signal<string>('Efectivo');
  checkoutImpuesto = signal<number>(0);
  checkoutPropinaTipo = signal<string>('Sin propina');
  checkoutPropinaPersonalizada = signal<number>(0);
  checkoutEntrega = signal<number>(0);

  checkoutSubtotal = computed(() => this.orderSubtotal());
  
  checkoutImpuestoMonto = computed(() => {
    return this.checkoutSubtotal() * (this.checkoutImpuesto() / 100);
  });

  checkoutPropinaMonto = computed(() => {
    const tipo = this.checkoutPropinaTipo();
    const subtotal = this.checkoutSubtotal();
    if (tipo === '5%') return subtotal * 0.05;
    if (tipo === '10%') return subtotal * 0.10;
    if (tipo === '15%') return subtotal * 0.15;
    if (tipo === '20%') return subtotal * 0.20;
    if (tipo === 'Personalizada') return this.checkoutPropinaPersonalizada();
    return 0;
  });

  checkoutTotal = computed(() => {
    return this.checkoutSubtotal() + this.checkoutImpuestoMonto() + this.checkoutPropinaMonto();
  });

  checkoutVuelto = computed(() => {
    if (this.checkoutMetodoPago() !== 'Efectivo') return 0;
    const entrega = this.checkoutEntrega();
    const total = this.checkoutTotal();
    return entrega > total ? entrega - total : 0;
  });

  ngOnInit() {
    this.loadMenu();
    this.loadDomiciliosActivos();
    this.loadDomiciliarios();
    this.loadBarrios();
    this.loadBorradoresFromStorage();

    this.clienteForm.valueChanges.subscribe(() => {
      if (this.showForm() || this.showOrderModal()) {
        this.activeOrderClientData.set(this.clienteForm.value);
        this.autoGuardarBorradorActual();
      }
    });

    this.realTimeSub = this._pedidosService.getEventsStream().subscribe({
      next: (event) => {
        if (
          event?.type === 'pedido_created' ||
          event?.type === 'pedido_updated' ||
          event?.type === 'pedido_deleted'
        ) {
          this.loadDomiciliosActivos();
        } else if (event?.type === 'impresion_fallida') {
          alert(
            `⚠️ ATENCIÓN: Falló la impresión de domicilio en ${event.data?.tipo || ''} (${event.data?.destino || ''}). Error: ${event.data?.error || 'Revisa conexión o papel'}`
          );
        }
      },
      error: (err) => console.warn('[Domicilios] SSE reconectando...', err),
    });
  }

  ngOnDestroy() {
    if (this.realTimeSub) this.realTimeSub.unsubscribe();
  }

  private _isResettingDraft = false;

  loadBorradoresFromStorage() {
    try {
      const raw = localStorage.getItem(this.BORRADORES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.borradoresList.set(parsed);
        }
      }
    } catch (e) {
      console.error('Error cargando borradores de domicilios:', e);
    }
  }

  saveBorradoresToStorage(list: DomicilioBorrador[]) {
    try {
      localStorage.setItem(this.BORRADORES_KEY, JSON.stringify(list));
      this.borradoresList.set(list);
    } catch (e) {
      console.error('Error guardando borradores de domicilios:', e);
    }
  }

  autoGuardarBorradorActual() {
    if (this._isResettingDraft) return;
    if (this.activeOrderId()) return; // No auto-guardar borradores si editamos un pedido existente en BD

    const clientData = this.clienteForm?.value || {};
    const items = this.orderItems() || [];

    const hasClientData = !!((clientData.cliente_nombre && String(clientData.cliente_nombre).trim()) || (clientData.cliente_telefono && String(clientData.cliente_telefono).trim()));
    const hasItems = items.length > 0;

    if (!hasClientData && !hasItems) return;

    let draftId = this.currentDraftId();
    if (!draftId) {
      draftId = `draft_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      this.currentDraftId.set(draftId);
    }

    const draftObj: DomicilioBorrador = {
      id: draftId,
      fechaCreacion: new Date().toISOString(),
      cliente: {
        cliente_nombre: clientData.cliente_nombre || '',
        cliente_telefono: clientData.cliente_telefono || '',
        cliente_direccion: clientData.cliente_direccion || '',
        cliente_barrio: clientData.cliente_barrio || '',
        domiciliario: clientData.domiciliario || ''
      },
      items: items,
      subtotal: this.orderSubtotal(),
      total: this.orderTotal()
    };

    const currentList = this.borradoresList();
    const existingIndex = currentList.findIndex(b => b.id === draftId);
    let updatedList: DomicilioBorrador[];

    if (existingIndex !== -1) {
      updatedList = [...currentList];
      updatedList[existingIndex] = draftObj;
    } else {
      updatedList = [draftObj, ...currentList];
    }

    this.saveBorradoresToStorage(updatedList);
  }

  saveAndCloseDraftModal(skipAutoSave: boolean = false) {
    if (!skipAutoSave && !this.activeOrderId()) {
      this.autoGuardarBorradorActual();
    }

    this._isResettingDraft = true;

    const draftId = this.currentDraftId();
    if (draftId && skipAutoSave) {
      this.limpiarBorradorSinConfirmar(draftId);
    }

    this.currentDraftId.set(null);
    this.activeOrderId.set(null);
    this.activeOrderNumber.set(null);
    this.selectedDomicilioDespacho.set(null);
    this.activeOrderClientData.set(null);
    this.showOrderModal.set(false);
    this.showForm.set(false);

    this.clienteForm.reset({}, { emitEvent: false });
    this.orderItems.set([]);
    this.originalOrderItems.set([]);
    this.orderSubtotal.set(0);
    this.orderTax.set(0);
    this.orderTotal.set(0);

    this._isResettingDraft = false;
    this.loadBorradoresFromStorage();
  }

  cargarBorrador(borrador: DomicilioBorrador) {
    this._cierreCajaService.getTurnoAbierto().subscribe({
      next: (res) => {
        if (!res || !res.abierto) {
          alert('⚠️ Debes abrir la caja del día (en la barra superior) antes de poder registrar domicilios.');
          return;
        }
        this._isResettingDraft = true;
        this.activeOrderId.set(null);
        this.activeOrderNumber.set(null);
        this.selectedDomicilioDespacho.set(null);

        this.currentDraftId.set(borrador.id);

        this.clienteForm.patchValue({
          cliente_nombre: borrador.cliente?.cliente_nombre || '',
          cliente_telefono: borrador.cliente?.cliente_telefono || '',
          cliente_direccion: borrador.cliente?.cliente_direccion || '',
          cliente_barrio: borrador.cliente?.cliente_barrio || '',
          domiciliario: borrador.cliente?.domiciliario || ''
        }, { emitEvent: false });

        this.activeOrderClientData.set(this.clienteForm.value);

        const itemsCopy = JSON.parse(JSON.stringify(borrador.items || []));
        this.orderItems.set(itemsCopy);
        this.originalOrderItems.set(JSON.parse(JSON.stringify(itemsCopy)));

        const subtotal = itemsCopy.reduce((sum: number, item: any) => sum + (Number(item.precio) || 0) * (Number(item.qty) || 1), 0);
        this.orderSubtotal.set(subtotal);
        this.orderTax.set(0);
        this.orderTotal.set(subtotal);

        this._isResettingDraft = false;
        this.showForm.set(false);
        this.showOrderModal.set(true);
      },
      error: () => alert('⚠️ Error al verificar la caja del día')
    });
  }

  nuevoBorrador() {
    this.saveAndCloseDraftModal();
    this.showForm.set(true);
  }

  eliminarBorrador(id: string, event?: Event) {
    if (event) event.stopPropagation();
    if (!confirm('¿Deseas eliminar este borrador de domicilio de localStorage?')) return;

    const currentList = this.borradoresList();
    const updatedList = currentList.filter(b => b.id !== id);
    this.saveBorradoresToStorage(updatedList);

    if (this.currentDraftId() === id) {
      this._isResettingDraft = true;
      this.currentDraftId.set(null);
      this.activeOrderClientData.set(null);
      this.clienteForm.reset({}, { emitEvent: false });
      this.orderItems.set([]);
      this.originalOrderItems.set([]);
      this.orderSubtotal.set(0);
      this.orderTotal.set(0);
      this.showOrderModal.set(false);
      this.showForm.set(false);
      this._isResettingDraft = false;
    }
  }

  limpiarBorradorSinConfirmar(id: string) {
    const currentList = this.borradoresList();
    const updatedList = currentList.filter(b => b.id !== id);
    this.saveBorradoresToStorage(updatedList);
    if (this.currentDraftId() === id) {
      this.currentDraftId.set(null);
    }
  }

  loadBarrios() {
    this._barriosService.getAll().subscribe({
      next: (data) => this.barrios.set(data || []),
      error: (err) => console.error('Error al cargar barrios del backend:', err)
    });
  }

  openBarriosModal() {
    this.loadBarrios();
    this.resetBarrioForm();
    this.showBarriosModal.set(true);
  }

  closeBarriosModal() {
    this.showBarriosModal.set(false);
    this.resetBarrioForm();
  }

  resetBarrioForm() {
    this.barrioNombreInput.set('');
    this.barrioPrecioInput.set(0);
    this.editingBarrioId.set(null);
  }

  saveBarrio() {
    const nombre = this.barrioNombreInput().trim();
    const precio = Number(this.barrioPrecioInput()) || 0;
    if (!nombre) {
      alert('Por favor ingresa el nombre del barrio.');
      return;
    }

    const editingId = this.editingBarrioId();

    if (editingId) {
      this._barriosService.update(editingId, { nombre, precio }).subscribe({
        next: () => {
          this.loadBarrios();
          this.resetBarrioForm();
        },
        error: (err) => alert(err.error?.message || 'Error al actualizar barrio')
      });
    } else {
      this._barriosService.create({ nombre, precio }).subscribe({
        next: () => {
          this.loadBarrios();
          this.resetBarrioForm();
        },
        error: (err) => alert(err.error?.message || 'Error al crear barrio')
      });
    }
  }

  editBarrio(b: BarrioTarifa) {
    this.editingBarrioId.set(String(b.id));
    this.barrioNombreInput.set(b.nombre);
    this.barrioPrecioInput.set(b.precio);
  }

  deleteBarrio(id: number | string) {
    if (!confirm('¿Está seguro de eliminar este barrio de la lista de tarifas?')) return;
    this._barriosService.delete(id).subscribe({
      next: () => {
        this.loadBarrios();
        if (this.editingBarrioId() === String(id)) {
          this.resetBarrioForm();
        }
      },
      error: (err) => alert(err.error?.message || 'Error al eliminar barrio')
    });
  }

  loadDomiciliarios() {
    this._usersService.getAll().subscribe({
      next: (users) => {
        const domis = (users || []).filter(u => {
          const roleName = (u.role?.name || '').toLowerCase().trim();
          const isDomiRole = roleName.includes('domiciliario') || roleName.includes('repartidor') || u.role_id === 5 || u.role_id === 7 || (u.surname || '').toLowerCase().includes('domiciliario');
          const isActive = u.is_active !== false;
          return isDomiRole && isActive;
        });
        this.domiciliarios.set(domis);
      },
      error: (err) => console.error('Error loading domiciliarios:', err)
    });
  }

  loadDomiciliosActivos() {
    this._pedidosService.getActive().subscribe({
      next: (pedidos: any[]) => {
        const domicilios = (pedidos || []).filter(
          (p: any) => p.tipo === 'Domicilio' && p.estado !== 'Completado' && p.estado !== 'Cancelado'
        );
        this.domiciliosActivos.set(domicilios);
      },
      error: (err: any) => console.error('Error al cargar domicilios del backend:', err)
    });
  }

  async loadMenu() {
    try {
      const [platos, categoriasRes] = await Promise.all([
        firstValueFrom(this._platosService.getAll()),
        firstValueFrom(this._categoriasService.getAll('menu'))
      ]);
      const disponibles = platos.filter(p => p.disponible);
      this.menuPlatos.set(disponibles);
      
      this.todasLasCategorias.set(categoriasRes.data || []);
      
      const uniqueCategories = new Set(
        disponibles
          .map(p => p.categoria)
          .filter((c): c is string => !!c)
      );
      this.categories.set(['Todos', ...Array.from(uniqueCategories)]);
    } catch (error) {
      console.error('Error loading menu:', error);
    }
  }

  selectCategory(category: string) {
    this.selectedCategory.set(category);
  }

  private _searchTimeout: any;

  searchClientByPhone(event: Event) {
    const rawTelefono = (event.target as HTMLInputElement).value;
    // Normalizar: quitar todo lo que no sea dígito
    const telefono = rawTelefono.replace(/\D/g, '');
    
    if (telefono.length > 5) {
      if (this._searchTimeout) clearTimeout(this._searchTimeout);
      
      this._searchTimeout = setTimeout(() => {
        this._clientesService.getClientes().subscribe(clientes => {
          // Normalizar ambos lados: quitar todo lo que no sea dígito
          const cliente = clientes.find((c: Cliente) => {
            if (!c.telefono) return false;
            const stored = c.telefono.replace(/\D/g, '');
            // Comparar directo o sin prefijo de país (57)
            return stored === telefono 
              || stored.endsWith(telefono) 
              || telefono.endsWith(stored);
          });
          if (cliente) {
            this.clienteForm.patchValue({
              cliente_nombre: cliente.nombre,
              cliente_direccion: cliente.direccion,
              cliente_barrio: cliente.barrio || ''
            });
            console.log(`[Domicilio] Cliente encontrado por teléfono: ${cliente.nombre}`);
          } else {
            console.log(`[Domicilio] No se encontró cliente con teléfono: ${telefono} (total clientes: ${clientes.length})`);
          }
        });
      }, 300); // Debounce de 300ms
    }
  }

  openNewDomicilio() {
    this._cierreCajaService.getTurnoAbierto().subscribe({
      next: (res) => {
        if (!res || !res.abierto) {
          alert('⚠️ Debes abrir la caja del día (en la barra superior) antes de poder registrar domicilios.');
          return;
        }
        this.saveAndCloseDraftModal();
        this.showForm.set(true);
      },
      error: () => alert('⚠️ Error al verificar la caja del día')
    });
  }

  onSubmitCliente() {
    if (this.clienteForm.invalid) return;
    
    const clientData = this.clienteForm.value;

    // Save or update client in backend
    const normalizedPhone = clientData.cliente_telefono?.replace(/\D/g, '') || '';
    this._clientesService.getClientes().subscribe(clientes => {
      const existing = clientes.find((c: Cliente) => {
        if (!c.telefono) return false;
        const stored = c.telefono.replace(/\D/g, '');
        return stored === normalizedPhone || stored.endsWith(normalizedPhone) || normalizedPhone.endsWith(stored);
      });
      const payload = {
        nombre: clientData.cliente_nombre,
        telefono: clientData.cliente_telefono,
        direccion: clientData.cliente_direccion,
        barrio: clientData.cliente_barrio
      };
      
      if (existing) {
        this._clientesService.updateCliente(existing.cliente_id, payload).subscribe();
      } else {
        this._clientesService.createCliente(payload).subscribe();
      }
    });

    this.showForm.set(false);
    
    this.activeOrderId.set(null);
    this.activeOrderNumber.set(null);
    this.selectedDomicilioDespacho.set(null);
    this.activeOrderClientData.set(clientData);
    this.orderItems.set([]);
    this.originalOrderItems.set([]);
    this.updateTotals();
    this.showOrderModal.set(true);
  }

  openExistingDomicilio(domicilio: any) {
    this._cierreCajaService.getTurnoAbierto().subscribe({
      next: (res) => {
        if (!res || !res.abierto) {
          alert('⚠️ Debes abrir la caja del día (en la barra superior) antes de poder registrar o modificar domicilios.');
          return;
        }
        this.activeOrderId.set(domicilio.id);
        this.activeOrderNumber.set(domicilio.orderNumber || null);
        this.despachoMetodoPago.set(domicilio.metodo_pago || 'Efectivo');
        this.despachoEntrega.set(domicilio.monto_entregado || 0);
        this.activeOrderClientData.set({
          cliente_nombre: domicilio.cliente_nombre,
          cliente_telefono: domicilio.cliente_telefono,
          cliente_direccion: domicilio.cliente_direccion,
          cliente_barrio: domicilio.cliente_barrio || '',
          domiciliario: domicilio.domiciliario,
        });
        const itemsCopy = JSON.parse(JSON.stringify(domicilio.items || []));
        this.orderItems.set(itemsCopy);
        this.originalOrderItems.set(JSON.parse(JSON.stringify(itemsCopy)));
        this.updateTotals();
        this.showOrderModal.set(true);
      },
      error: () => alert('⚠️ Error al verificar el estado de la caja')
    });
  }

  closeOrderModal() {
    this.saveAndCloseDraftModal();
  }

  private calculateNewItems(original: any[], current: any[]): any[] {
    const newItems: any[] = [];
    for (const item of current) {
      const itemKey = `${item.id || item.nombre}_${item.notas || ''}_${item.tipoEntrega || 'llevar'}`;
      const origMatch = (original || []).find(o => `${o.id || o.nombre}_${o.notas || ''}_${o.tipoEntrega || 'llevar'}` === itemKey);
      const origQty = origMatch ? Number(origMatch.qty || 0) : 0;
      const diffQty = Number(item.qty || 0) - origQty;
      if (diffQty > 0) {
        newItems.push({
          ...item,
          qty: diffQty
        });
      }
    }
    return newItems;
  }

  openHistoryModal() {
    this._pedidosService.getAll(true).subscribe({
      next: (pedidos: any[]) => {
        const domicilios = (pedidos || []).filter((p: any) => p.tipo === 'Domicilio');
        domicilios.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        this.orderHistory.set(domicilios);
        this.showHistoryModal.set(true);
      },
      error: (err: any) => console.error('Error cargando historial de domicilios:', err)
    });
  }

  closeHistoryModal() {
    this.showHistoryModal.set(false);
  }

  get filteredOrderHistory(): any[] {
    const history = this.orderHistory();
    const filterDate = this.historyFilterDate();
    
    if (!filterDate) return history;
    
    return history.filter(pedido => {
      const d = new Date(pedido.fecha);
      if (isNaN(d.getTime())) return false;
      const pedidoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return pedidoDate === filterDate;
    });
  }

  viewOrderDetails(pedido: any) {
    this.selectedHistoryOrder.set(pedido);
  }

  closeOrderDetails() {
    this.selectedHistoryOrder.set(null);
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
    if (m.includes('mixto')) return 'Pago Mixto';
    if (m.includes('davi')) return 'Daviplata';
    if (m.includes('bre')) return 'Bre-B';
    if (m.includes('bold')) return 'Bold';
    if (m.includes('cred') || m.includes('créd')) return 'Crédito';
    if (m.includes('tarjeta') || m.includes('dataf')) return 'Tarjeta';
    if (m.includes('transf') || m.includes('banc')) return 'Transferencia';
    if (m.includes('efec')) return 'Efectivo';

    if (['Efectivo', 'Tarjeta', 'Nequi', 'Daviplata', 'Bre-B', 'Bold', 'Crédito', 'Transferencia', 'Pago Mixto', 'Otros'].includes(raw)) {
      return raw;
    }

    return 'Otros';
  }

  cambiarMetodoPago(pedido: any, nuevoMetodo: string) {
    if (!pedido || !pedido.id || !nuevoMetodo) return;
    if (this.getMetodoPagoValue(pedido.metodo_pago) === nuevoMetodo) return;

    if (nuevoMetodo === 'Pago Mixto') {
      this.openEditarPedidoHistorial(pedido);
      return;
    }

    const metodoAnterior = pedido.metodo_pago;
    pedido.metodo_pago = nuevoMetodo;

    this._pedidosService.update(pedido.id, { metodo_pago: nuevoMetodo }).subscribe({
      next: () => {
        console.log(`[Historial Domicilios] Método de pago actualizado para pedido #${pedido.orderNumber || pedido.id} a: ${nuevoMetodo}`);
      },
      error: (err) => {
        console.error('Error al cambiar método de pago:', err);
        pedido.metodo_pago = metodoAnterior;
        alert('Error al actualizar el método de pago en el servidor.');
      }
    });
  }

  // Editar Pedido del Historial (Precio y Pago Mixto)
  showEditHistoryOrderModal = signal(false);
  editingHistoryOrder = signal<any | null>(null);
  editingHistoryTotal = signal<number>(0);
  editingHistorySubtotal = signal<number>(0);
  editingHistoryMetodoPago = signal<string>('Efectivo');
  editingHistoryPagosMixtos = signal<{ metodo: string; monto: number }[]>([
    { metodo: 'Efectivo', monto: 0 },
    { metodo: 'Nequi', monto: 0 }
  ]);
  editingHistoryEntrega = signal<number>(0);

  openEditarPedidoHistorial(pedido: any) {
    if (!pedido) return;
    this.editingHistoryOrder.set(pedido);
    this.editingHistoryTotal.set(Number(pedido.total) || 0);
    this.editingHistorySubtotal.set(Number(pedido.subtotal) || Number(pedido.total) || 0);
    
    const metodo = this.getMetodoPagoValue(pedido.metodo_pago);
    this.editingHistoryMetodoPago.set(metodo);

    let rawMixtos: any[] = [];
    if (Array.isArray(pedido.pagos_mixtos)) rawMixtos = pedido.pagos_mixtos;
    else if (typeof pedido.pagos_mixtos === 'string') {
      try { rawMixtos = JSON.parse(pedido.pagos_mixtos); } catch(e) {}
    }

    if (rawMixtos.length > 0) {
      this.editingHistoryPagosMixtos.set(rawMixtos);
    } else {
      const tot = Number(pedido.total) || 0;
      const mitad = Math.floor(tot / 2);
      this.editingHistoryPagosMixtos.set([
        { metodo: 'Efectivo', monto: mitad },
        { metodo: 'Nequi', monto: tot - mitad }
      ]);
    }
    this.editingHistoryEntrega.set(Number(pedido.monto_entregado) || 0);
    this.showEditHistoryOrderModal.set(true);
  }

  addEditingHistoryPagoMixtoFila() {
    const current = this.editingHistoryPagosMixtos();
    const total = this.editingHistoryTotal();
    const suma = current.reduce((s, i) => s + (Number(i.monto) || 0), 0);
    const faltante = Math.max(0, total - suma);
    this.editingHistoryPagosMixtos.set([...current, { metodo: 'Nequi', monto: faltante }]);
  }

  removeEditingHistoryPagoMixtoFila(index: number) {
    const current = this.editingHistoryPagosMixtos();
    if (current.length <= 1) return;
    this.editingHistoryPagosMixtos.set(current.filter((_, i) => i !== index));
  }

  updateEditingHistoryPagoMixtoFila(index: number, field: 'metodo' | 'monto', val: any) {
    const current = [...this.editingHistoryPagosMixtos()];
    if (field === 'monto') {
      current[index].monto = Math.max(0, Number(val) || 0);
    } else {
      current[index].metodo = val;
    }
    this.editingHistoryPagosMixtos.set(current);
  }

  guardarCambiosPedidoHistorial() {
    const pedido = this.editingHistoryOrder();
    if (!pedido || !pedido.id) return;

    const nuevoTotal = Number(this.editingHistoryTotal()) || 0;
    const nuevoSubtotal = Number(this.editingHistorySubtotal()) || nuevoTotal;
    const nuevoMetodo = this.editingHistoryMetodoPago();
    const esMixto = nuevoMetodo === 'Pago Mixto';

    let validMixtos: any[] = [];
    if (esMixto) {
      const sumaMixtos = this.editingHistoryPagosMixtos().reduce((s, i) => s + (Number(i.monto) || 0), 0);
      if (Math.abs(sumaMixtos - nuevoTotal) > 1) {
        alert(`La suma del Pago Mixto ($${sumaMixtos.toLocaleString()}) no coincide con el nuevo total ($${nuevoTotal.toLocaleString()}).`);
        return;
      }
      validMixtos = this.editingHistoryPagosMixtos().filter(p => Number(p.monto) > 0);
    }

    const payload: any = {
      subtotal: nuevoSubtotal,
      total: nuevoTotal,
      metodo_pago: nuevoMetodo,
      monto_entregado: Number(this.editingHistoryEntrega()) || 0
    };

    if (esMixto) {
      payload.pagos_mixtos = validMixtos;
    } else {
      payload.pagos_mixtos = null;
    }

    this._pedidosService.update(pedido.id, payload).subscribe({
      next: (updated: any) => {
        this.showEditHistoryOrderModal.set(false);
        this.editingHistoryOrder.set(null);
        const historyList = [...this.orderHistory()];
        const idx = historyList.findIndex(p => p.id === pedido.id);
        if (idx !== -1) {
          historyList[idx] = { ...historyList[idx], ...payload };
          this.orderHistory.set(historyList);
        }
        if (this.selectedHistoryOrder()?.id === pedido.id) {
          this.selectedHistoryOrder.set({ ...this.selectedHistoryOrder(), ...payload });
        }
        alert('Domicilio actualizado correctamente en la base de datos.');
      },
      error: (err: any) => alert(err.error?.message || 'Error al actualizar el domicilio')
    });
  }

  getPizzaPrice(plato: Plato, size: string): number {
    let pxt = plato.precios_por_tamano;
    if (pxt && typeof pxt === 'string') {
      try {
        pxt = JSON.parse(pxt);
      } catch (e) {
        console.error('Error parsing precios_por_tamano:', e);
        pxt = {};
      }
    }
    pxt = pxt || {};

    if (pxt[size] !== undefined && pxt[size] !== null && pxt[size] > 0) {
      return pxt[size];
    }
    const base = plato.precio;
    switch (size) {
      case 'Personal': return Math.round(base * 0.7);
      case 'Mediana': return base;
      case 'Grande': return Math.round(base * 1.3);
      case 'Extragrande': return Math.round(base * 1.6);
      case 'Gigante': return Math.round(base * 1.9);
      case 'Familiar': return Math.round(base * 2.2);
      default: return base;
    }
  }

  cleanPizzaName(nombre: string): string {
    return nombre
      .replace(/\s+(Mediana|Familiar|Personal|Grande|Extragrande|Gigante)$/i, '')
      .replace(/^Pizza\s+/i, '')
      .trim();
  }

  addPizzaWithSize(plato: Plato, size: string, event?: Event) {
    if (!plato.disponible) return;
    
    const price = this.getPizzaPrice(plato, size);
    const cleanedName = this.cleanPizzaName(plato.nombre);
    const name = `${cleanedName} (${size})`;
    
    const items = [...this.orderItems()];
    const id = `${plato.plato_id}-${size}`;
    const existing = items.find(i => i.id === id);
    
    const categoriaDef = this.todasLasCategorias().find(c => c.nombre === plato.categoria);
    const seccion = categoriaDef?.seccion || 'Pizzas';

    if (existing) {
      existing.qty += 1;
    } else {
      items.push({
        id,
        nombre: name,
        precio: price,
        qty: 1,
        seccion: seccion,
        categoria: plato.categoria,
        tipoEntrega: 'llevar',
        paraLlevar: true,
        notas: ''
      });
    }
    this.orderItems.set(items);
    this.updateTotals();
  }

  openHalfAndHalfModal() {
    this.selectedHalfSize.set('Grande');
    this.selectedFlavor1.set(null);
    this.selectedFlavor2.set(null);
    this.showHalfAndHalfModal.set(true);
  }

  addHalfAndHalfToCart() {
    const f1 = this.selectedFlavor1();
    const f2 = this.selectedFlavor2();
    const size = this.selectedHalfSize();
    if (!f1 || !f2) return;
    
    const price = this.halfAndHalfPrice();
    const cleanedName1 = this.cleanPizzaName(f1.nombre);
    const cleanedName2 = this.cleanPizzaName(f2.nombre);
    const name = `Mitad ${cleanedName1} / Mitad ${cleanedName2} (${size})`;
    
    const items = [...this.orderItems()];
    const id = `half-${f1.plato_id}-${f2.plato_id}-${size}`;
    const existing = items.find(i => i.id === id);
    
    if (existing) {
      existing.qty += 1;
    } else {
      items.push({
        id,
        nombre: name,
        precio: price,
        qty: 1,
        seccion: 'Pizzas',
        categoria: f1.categoria,
        tipoEntrega: 'llevar',
        paraLlevar: true,
        notas: ''
      });
    }
    this.orderItems.set(items);
    this.updateTotals();
    this.showHalfAndHalfModal.set(false);
    this.selectedFlavor1.set(null);
    this.selectedFlavor2.set(null);
  }

  addPlato(plato: Plato) {
    if (!plato || !plato.disponible) return;
    const items = [...this.orderItems()];
    const targetId = String(plato.plato_id);
    const existing = items.find(i => String(i.id) === targetId);
    
    const categoriaDef = this.todasLasCategorias().find(c => c.nombre === plato.categoria);
    const seccion = categoriaDef?.seccion || 'Parrilla';

    if (existing) {
      existing.qty += 1;
    } else {
      items.push({
        id: targetId,
        nombre: plato.nombre,
        precio: Number(plato.precio) || 0,
        qty: 1,
        seccion: seccion,
        categoria: plato.categoria,
        tipoEntrega: 'llevar',
        paraLlevar: true,
        notas: ''
      });
    }
    this.orderItems.set(items);
    this.updateTotals();
  }

  updateItemNota(itemId: any, nota: string): void {
    const items = [...this.orderItems()];
    const targetId = String(itemId);
    const item = items.find(i => String(i.id) === targetId);
    if (item) {
      item.notas = nota;
      item.observaciones = nota;
      this.orderItems.set(items);
    }
  }

  removePlato(platoId: any) {
    const items = [...this.orderItems()];
    const targetId = String(platoId);
    const existing = items.find(i => String(i.id) === targetId);
    if (existing) {
      if (existing.qty > 1) {
        existing.qty -= 1;
      } else {
        const index = items.indexOf(existing);
        items.splice(index, 1);
      }
    }
    this.orderItems.set(items);
    this.updateTotals();
  }

  incrementQty(platoId: any) {
    const items = [...this.orderItems()];
    const targetId = String(platoId);
    const existing = items.find(i => String(i.id) === targetId);
    if (existing) {
      existing.qty += 1;
      this.orderItems.set(items);
      this.updateTotals();
    }
  }

  updateTotals() {
    const subtotal = this.orderItems().reduce((sum, item) => sum + item.precio * item.qty, 0);
    const tax = 0;
    this.orderSubtotal.set(subtotal);
    this.orderTax.set(tax);
    this.orderTotal.set(subtotal + tax);
    this.autoGuardarBorradorActual();
  }

  iniciarPagoYDespachar() {
    const items = this.orderItems();
    if (items.length === 0) {
      alert('Agrega al menos un platillo al pedido.');
      return;
    }

    const clientData = this.activeOrderClientData() || {};
    if (!clientData.cliente_nombre || !clientData.cliente_telefono) {
      alert('Ingresa al menos el nombre y teléfono del cliente.');
      return;
    }

    const currentId = this.activeOrderId();
    const tempDomicilio = {
      id: currentId || null,
      subtotal: this.orderSubtotal(),
      total: this.orderTotal(),
      cliente_nombre: clientData.cliente_nombre || 'Cliente Domicilio',
      cliente_telefono: clientData.cliente_telefono || '',
      cliente_direccion: clientData.cliente_direccion || '',
      cliente_barrio: clientData.cliente_barrio || '',
      domiciliario: clientData.domiciliario || '',
      items: items
    };

    this.abrirModalDespacho(tempDomicilio, undefined, false);
  }

  registerOrder() {
    this.iniciarPagoYDespachar();
  }

  completarDomicilio(domicilio: any, event?: Event) {
    if (event) event.stopPropagation();
    if (!confirm(`¿Confirmas marcar como COMPLETADO el domicilio de ${domicilio.cliente_nombre || 'Cliente'}?`)) return;

    const metodo = String(domicilio.metodo_pago || 'Efectivo').toLowerCase();
    if (metodo.includes('efectivo')) {
      this._mesasService.abrirCaja().subscribe({
        next: (res: any) => console.log('[Domicilios] Caja abierta al completar domicilio en efectivo:', res),
        error: (err: any) => console.error('[Domicilios] Error al abrir caja registradora:', err)
      });
    }

    this._pedidosService.update(domicilio.id, { estado: 'Completado' }).subscribe({
      next: () => {
        this.loadDomiciliosActivos();
        alert(`El domicilio de ${domicilio.cliente_nombre || 'Cliente'} ha sido marcado como COMPLETADO.`);
      },
      error: (err: any) => alert(err.error?.message || 'Error al completar domicilio')
    });
  }

  despacharDomicilio(domicilio: any, event?: Event) {
    if (event) event.stopPropagation();
    this.abrirModalDespacho(domicilio, event, false);
  }

  abrirModalDespacho(domicilio: any, event?: Event, isCompleting: boolean = false) {
    if (event) event.stopPropagation();
    this.selectedDomicilioDespacho.set(domicilio);
    this.isCompletingMode.set(isCompleting);

    const metodo = domicilio.metodo_pago || 'Efectivo';
    this.despachoMetodoPago.set(metodo);
    this.despachoImpuestoPct.set(Number(domicilio.impuesto_porcentaje) || 0);
    this.despachoEntrega.set(domicilio.monto_entregado || 0);

    let rawMixtos: any[] = [];
    if (Array.isArray(domicilio.pagos_mixtos)) rawMixtos = domicilio.pagos_mixtos;
    else if (typeof domicilio.pagos_mixtos === 'string') {
      try { rawMixtos = JSON.parse(domicilio.pagos_mixtos); } catch(e) {}
    }
    if (rawMixtos && rawMixtos.length > 0) {
      this.despachoPagosMixtosList.set(rawMixtos);
    } else if (metodo === 'Pago Mixto') {
      this.inicializarDespachoPagoMixto();
    }

    const domisList = this.domiciliarios();
    const initialDomi = domicilio.domiciliario || (domisList.length > 0 ? `${domisList[0].name} ${domisList[0].surname}` : '');
    this.despachoDomiciliario.set(initialDomi);

    const clientBarrioName = domicilio.cliente_barrio || domicilio.barrio || '';
    const barriosList = this.barrios();
    const foundBarrio = barriosList.find(b => b.nombre.toLowerCase() === clientBarrioName.toLowerCase());
    if (foundBarrio) {
      this.despachoBarrioSeleccionado.set(foundBarrio);
    } else if (barriosList.length > 0) {
      this.despachoBarrioSeleccionado.set(barriosList[0]);
    } else {
      this.despachoBarrioSeleccionado.set(null);
    }

    this.showDespachoModal.set(true);
  }

  cerrarModalDespacho() {
    this.showDespachoModal.set(false);
    this.selectedDomicilioDespacho.set(null);
    this.despachoBarrioSeleccionado.set(null);
    this.despachoDomiciliario.set('');
    this.isCompletingMode.set(false);
  }

  despachoPagosMixtosList = signal<{ metodo: string; monto: number }[]>([
    { metodo: 'Efectivo', monto: 0 },
    { metodo: 'Nequi', monto: 0 }
  ]);

  despachoTotalPagadoMixto = computed(() => {
    return this.despachoPagosMixtosList().reduce((sum, item) => sum + (Number(item.monto) || 0), 0);
  });

  despachoDiferenciaMixto = computed(() => {
    return this.despachoTotal() - this.despachoTotalPagadoMixto();
  });

  despachoMontoEfectivoMixto = computed(() => {
    if (this.despachoMetodoPago() !== 'Pago Mixto') return 0;
    const sub = this.despachoPagosMixtosList().find(p => String(p.metodo).toLowerCase().includes('efectivo'));
    return Number(sub?.monto) || 0;
  });

  despachoVueltoMixto = computed(() => {
    if (this.despachoMetodoPago() !== 'Pago Mixto') return 0;
    const entrega = Number(this.despachoEntrega()) || 0;
    const efectivoReq = this.despachoMontoEfectivoMixto();
    return (entrega > efectivoReq && efectivoReq > 0) ? (entrega - efectivoReq) : 0;
  });

  addDespachoPagoMixtoFila() {
    const current = this.despachoPagosMixtosList();
    const faltante = Math.max(0, this.despachoDiferenciaMixto());
    this.despachoPagosMixtosList.set([...current, { metodo: 'Nequi', monto: faltante }]);
  }

  removeDespachoPagoMixtoFila(index: number) {
    const current = this.despachoPagosMixtosList();
    if (current.length <= 1) return;
    this.despachoPagosMixtosList.set(current.filter((_, i) => i !== index));
  }

  updateDespachoPagoMixtoFila(index: number, field: 'metodo' | 'monto', val: any) {
    const current = [...this.despachoPagosMixtosList()];
    if (field === 'monto') {
      current[index].monto = Math.max(0, Number(val) || 0);
    } else {
      current[index].metodo = val;
    }
    this.despachoPagosMixtosList.set(current);
  }

  inicializarDespachoPagoMixto() {
    const total = this.despachoTotal();
    const mitad = Math.floor(total / 2);
    this.despachoPagosMixtosList.set([
      { metodo: 'Efectivo', monto: mitad },
      { metodo: 'Nequi', monto: total - mitad }
    ]);
  }

  seleccionarBarrioDespacho(barrio: BarrioTarifa) {
    this.despachoBarrioSeleccionado.set(barrio);
  }

  setDespachoPaymentMethod(method: string) {
    this.despachoMetodoPago.set(method);
    if (method === 'Pago Mixto') {
      this.inicializarDespachoPagoMixto();
    } else if (method !== 'Efectivo') {
      this.despachoEntrega.set(0);
    }
  }

  confirmarDespachoOrder() {
    const domicilio = this.selectedDomicilioDespacho();
    if (!domicilio) return;

    const esMixto = this.despachoMetodoPago() === 'Pago Mixto';
    let validPagosMixtos: { metodo: string; monto: number }[] = [];

    if (esMixto) {
      if (Math.abs(this.despachoDiferenciaMixto()) > 1) {
        if (this.despachoDiferenciaMixto() > 1) {
          alert(`El desglose de Pago Mixto ($${this.despachoTotalPagadoMixto().toLocaleString()}) no cubre el total del domicilio ($${this.despachoTotal().toLocaleString()}). Falta: $${this.despachoDiferenciaMixto().toLocaleString()}`);
        } else {
          alert(`El desglose de Pago Mixto sobrepasa el total del domicilio por $${(-this.despachoDiferenciaMixto()).toLocaleString()}. Ajusta los montos.`);
        }
        return;
      }
      validPagosMixtos = this.despachoPagosMixtosList().filter(p => Number(p.monto) > 0);
    }

    const items = this.orderItems();
    const clientData = this.activeOrderClientData() || {};
    const barrio = this.despachoBarrioSeleccionado();
    const chosenDomi = this.despachoDomiciliario() || clientData.domiciliario || domicilio.domiciliario || '';
    const isCompleting = this.isCompletingMode();
    const isAlreadyCreated = !!(domicilio.id && domicilio.estado && domicilio.estado !== 'Nuevo');

    let rawDomicilioItems = domicilio.items;
    if (typeof rawDomicilioItems === 'string') {
      try { rawDomicilioItems = JSON.parse(rawDomicilioItems); } catch(e) { rawDomicilioItems = []; }
    }
    if (!Array.isArray(rawDomicilioItems)) rawDomicilioItems = [];

    // Al despachar un domicilio directamente desde su tarjeta activa (showOrderModal es false),
    // o si la orden ya existe en BD con sus productos, usar SIEMPRE los ítems propios del domicilio.
    const sourceItems = (!this.showOrderModal() && rawDomicilioItems.length > 0)
      ? rawDomicilioItems
      : (items.length > 0 ? items : rawDomicilioItems);

    const formattedItems = sourceItems.map((i: any) => ({
      id: String(i.id || ''),
      nombre: i.nombre || '',
      precio: Number(i.precio) || 0,
      qty: Number(i.qty) || 1,
      seccion: i.seccion || i.categoria || '',
      categoria: i.categoria || i.seccion || '',
      tipoEntrega: i.tipoEntrega || 'llevar',
      paraLlevar: true,
      notas: i.notas || i.observaciones || ''
    }));

    const newEstado = isCompleting ? 'Completado' : (isAlreadyCreated ? 'En camino' : 'Enviado');

    const subtotalCalc = (!this.showOrderModal() && formattedItems.length > 0)
      ? formattedItems.reduce((s: number, i: any) => s + (Number(i.precio) || 0) * (Number(i.qty) || 1), 0)
      : (this.showOrderModal() ? this.despachoSubtotal() : (Number(domicilio.subtotal) || Number(domicilio.total) || 0));

    const costoEnvioCalc = this.getDomicilioCostoEnvio(domicilio);
    const totalCalc = subtotalCalc + costoEnvioCalc + this.despachoImpuestoMonto();

    const entregado = esMixto ? (this.despachoMontoEfectivoMixto() > 0 ? (Number(this.despachoEntrega()) || 0) : 0) : (this.despachoMetodoPago() === 'Efectivo' ? (Number(this.despachoEntrega()) || 0) : 0);
    const cambio = esMixto ? this.despachoVueltoMixto() : (this.despachoMetodoPago() === 'Efectivo' ? this.despachoVuelto() : 0);

    const currentUser = this._authService.user();
    const currentUserName = currentUser ? `${currentUser.name} ${currentUser.surname || ''}`.trim() : 'Administrador';

    const payload: any = {
      tipo: 'Domicilio',
      estado: newEstado,
      subtotal: subtotalCalc,
      costo_domicilio: costoEnvioCalc,
      impuesto_valor: this.despachoImpuestoMonto(),
      total: totalCalc,
      metodo_pago: this.despachoMetodoPago(),
      monto_entregado: entregado,
      vuelto: cambio,
      cliente_nombre: clientData.cliente_nombre || domicilio.cliente_nombre || 'Cliente Domicilio',
      cliente_telefono: clientData.cliente_telefono || domicilio.cliente_telefono || '',
      cliente_direccion: clientData.cliente_direccion || domicilio.cliente_direccion || '',
      cliente_barrio: barrio ? barrio.nombre : (clientData.cliente_barrio || domicilio.cliente_barrio || ''),
      domiciliario: chosenDomi,
      mesero: currentUserName,
      usuario_id: currentUser?.id,
      items: formattedItems
    };
    if (esMixto) {
      payload.pagos_mixtos = validPagosMixtos;
    }

    if (domicilio.id) {
      const newItems = this.calculateNewItems(this.originalOrderItems(), formattedItems);
      this._pedidosService.update(domicilio.id, payload).subscribe({
        next: (updatedOrder: any) => {
          this.onPagoDespachoExitoso(updatedOrder, payload, formattedItems, newItems, isAlreadyCreated, isCompleting, true);
        },
        error: (err: any) => alert(err.error?.message || 'Error al procesar el domicilio')
      });
    } else {
      delete payload.id;
      this._pedidosService.createPedido(payload).subscribe({
        next: (createdOrder: any) => {
          this.onPagoDespachoExitoso(createdOrder, payload, formattedItems, formattedItems, false, false, false);
        },
        error: (err: any) => alert(err.error?.message || 'Error al crear y registrar domicilio')
      });
    }
  }

  private onPagoDespachoExitoso(
    order: any,
    payload: any,
    allItems: any[],
    newItemsToPrint: any[],
    isDispatchingFromCard: boolean,
    isCompleting: boolean,
    isUpdate: boolean
  ) {
    // Regla de Domicilios: La caja registradora se abre ÚNICAMENTE al completar un domicilio cuyo pago contenga Efectivo
    const metodoStr = String(payload.metodo_pago || order.metodo_pago || this.despachoMetodoPago() || '').toLowerCase();
    const tieneEfectivoMixto = (metodoStr === 'pago mixto' || this.despachoMetodoPago() === 'Pago Mixto') && (this.despachoMontoEfectivoMixto() > 0);
    const esPagoEnEfectivo = metodoStr.includes('efectivo') || tieneEfectivoMixto;

    if (isCompleting && esPagoEnEfectivo) {
      this._mesasService.abrirCaja().subscribe({
        next: (res: any) => console.log('[Domicilios] Caja abierta al completar domicilio pagado en efectivo:', res),
        error: (err: any) => console.error('[Domicilios] Error al abrir caja registradora:', err)
      });
    }

    const pedidoInfo = {
      id: order.id,
      orderNumber: order.orderNumber,
      domicilioNumber: order.domicilioNumber,
      ...payload,
      items: allItems,
      esAdicion: isUpdate
    };

    if (!isDispatchingFromCard && !isCompleting) {
      // 1. Registro inicial de pago / actualización: Imprime ticket de comanda a cocina SOLO con ítems nuevos
      if (newItemsToPrint && newItemsToPrint.length > 0) {
        this._mesasService.confirmarDomicilio(pedidoInfo, newItemsToPrint).subscribe({
          next: (res: any) => console.log('[Cocina] Comanda de domicilio enviada a impresión:', res),
          error: (err: any) => console.error('[Cocina] Error al imprimir comanda:', err)
        });
        alert(`Pago de domicilio registrado exitosamente (${this.despachoMetodoPago()}). Comanda de adición (${newItemsToPrint.length} ítems) enviada a cocina.`);
      } else {
        alert(`Pago de domicilio registrado exitosamente (${this.despachoMetodoPago()}). Domicilio actualizado (sin ítems nuevos para comanda).`);
      }
    } else if (isDispatchingFromCard && !isCompleting) {
      // 2. Clic en "Despachar": Imprime el RECIBO DE DOMICILIO completo para el cliente/repartidor en la impresora de Caja Principal
      this._mesasService.imprimirFactura(pedidoInfo, 'Caja').subscribe({
        next: () => console.log('[Despacho] Recibo de domicilio impreso exitosamente en la impresora principal de caja.'),
        error: (err: any) => console.error('[Despacho] Error al imprimir recibo de domicilio:', err)
      });
      alert(`Domicilio despachado (En camino). Recibo impreso en la impresora principal de Caja.`);
    } else if (isCompleting) {
      alert(`El domicilio ha sido marcado como COMPLETADO.`);
    }

    const activeDraft = this.currentDraftId();
    if (activeDraft) {
      this.limpiarBorradorSinConfirmar(activeDraft);
    }

    const clientPhone = payload.cliente_telefono || order.cliente_telefono;
    if (clientPhone) {
      const normPhone = String(clientPhone).replace(/\D/g, '');
      const matchingDraft = this.borradoresList().find(b => {
        const p = String(b.cliente?.cliente_telefono || '').replace(/\D/g, '');
        return p && normPhone && (p === normPhone || p.endsWith(normPhone) || normPhone.endsWith(p));
      });
      if (matchingDraft) {
        this.limpiarBorradorSinConfirmar(matchingDraft.id);
      }
    }

    this.loadDomiciliosActivos();
    this.cerrarModalDespacho();
    this.saveAndCloseDraftModal(true);
  }

  cancelarDomicilio(domicilio: any, event?: Event) {
    if (event) event.stopPropagation();
    if (!confirm('¿Estás seguro de cancelar este domicilio?')) return;

    this._pedidosService.update(domicilio.id, { estado: 'Cancelado' }).subscribe({
      next: () => this.loadDomiciliosActivos(),
      error: (err: any) => alert(err.error?.message || 'Error al cancelar domicilio')
    });
  }

  shortId(id: any): string {
    if (!id) return '';
    const str = String(id);
    return str.length > 8 ? str.slice(0, 8) : str;
  }

  imprimirTicketFactura(order: any) {
    if (!order) return;
    let rawItems = order.items || [];
    if (typeof rawItems === 'string') {
      try { rawItems = JSON.parse(rawItems); } catch (e) { rawItems = []; }
    }
    if (!Array.isArray(rawItems)) rawItems = [];

    const costoEnvio = this.getDomicilioCostoEnvio(order);
    const subtotal = Number(order.subtotal) || rawItems.reduce((s: number, i: any) => s + (Number(i.precio) || 0) * (Number(i.qty) || 1), 0);
    const total = Number(order.total) > subtotal ? Number(order.total) : (subtotal + costoEnvio);

    const pedidoInfo = {
      id: order.id,
      tipo: order.tipo || 'Domicilio',
      mesa: order.mesa || 'Domicilio',
      cliente_nombre: order.cliente_nombre || order.cliente || 'Cliente Domicilio',
      cliente_telefono: order.cliente_telefono || '',
      cliente_direccion: order.cliente_direccion || '',
      cliente_barrio: order.cliente_barrio || '',
      domiciliario: order.domiciliario || '',
      metodo_pago: order.metodo_pago || 'Efectivo',
      pagos_mixtos: order.pagos_mixtos || null,
      monto_entregado: order.monto_entregado || 0,
      vuelto: order.vuelto || 0,
      subtotal: subtotal,
      costo_domicilio: costoEnvio,
      impuesto_porcentaje: order.impuesto_porcentaje || 0,
      impuesto_valor: order.impuesto_valor || 0,
      propina_valor: order.propina_valor || 0,
      total: total,
      items: rawItems,
      fecha: order.fecha || order.created_at || order.createdAt
    };
    this._mesasService.imprimirFactura(pedidoInfo).subscribe({
      next: (res: any) => {
        alert(res?.message || 'Factura enviada a la Impresora Principal con éxito.');
      },
      error: (err: any) => {
        console.error('Error al enviar a la impresora principal:', err);
        alert(err.error?.message || 'Error al comunicarse con la impresora principal');
      }
    });
  }

  imprimirTicketFacturaDirecto(domicilio: any, event?: Event) {
    if (event) event.stopPropagation();
    this.imprimirTicketFactura(domicilio);
  }

  abrirCajaDirecta() {
    this._mesasService.abrirCaja().subscribe({
      next: (res: any) => console.log('[Domicilios] Pulso de apertura enviado al cajón monedero:', res),
      error: (err: any) => alert('Error al abrir la caja registradora: ' + (err.error?.message || err.message))
    });
  }
}

export default AdminDomiciliosPageComponent;
