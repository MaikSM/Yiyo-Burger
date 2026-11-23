import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';
import { normalizePhone, findClienteByPhone, MIN_PHONE_DIGITS } from '@admin/utils/cliente-match.util';
import { MesasService, Mesa } from '../../../admin/services/mesas.service';
import { PlatosService, Plato } from '../../../admin/services/platos.service';
import { CategoriasService, Categoria } from '../../../admin/services/categorias.service';
import { PedidosService, Order } from '../../../admin/services/pedidos.service';
import { BarriosService, BarrioTarifa } from '../../../admin/services/barrios.service';
import { ClientesService } from '../../../admin/services/clientes.service';
import { AuthService } from '@auth/services/auth.service';
import { CurrencyPipe as CopCurrencyPipe } from '@shared/pipes';
import { toast } from 'ngx-sonner';

export interface WaiterOrderItem {
  id: any;
  nombre: string;
  precio: number;
  qty: number;
  seccion?: string;
  categoria?: string;
  tipoEntrega?: 'mesa' | 'llevar';
  notas?: string;
}

export interface PrintConfirmConfig {
  title: string;
  message: string;
  printerLabel: string;
  confirmLabel: string;
  accent: 'emerald' | 'orange' | 'blue' | 'cyan';
  onConfirm: () => void;
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'waiter-mesas-page',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, CopCurrencyPipe],
  templateUrl: './waiter-mesas-page.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaiterMesasPageComponent implements OnInit, OnDestroy {
  private _mesasService = inject(MesasService);
  private _platosService = inject(PlatosService);
  private _categoriasService = inject(CategoriasService);
  private _pedidosService = inject(PedidosService);
  private _barriosService = inject(BarriosService);
  private _clientesService = inject(ClientesService);
  private _fb = inject(FormBuilder);
  public authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  // Estados de Mesas y Pedidos
  mesas = signal<Mesa[]>([]);
  activeOrdersList = signal<Order[]>([]);
  selectedMesa = signal<Mesa | null>(null);
  activeOrderId = signal<string | number | null>(null);
  showOrderModal = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  filtroUbicacion = signal<string>('Todas');

  // Estado del Catálogo de Menú
  menuPlatos = signal<Plato[]>([]);
  todasLasCategorias = signal<Categoria[]>([]);
  categories = signal<string[]>([]);
  activeSeccion = signal<string>('Todos');
  selectedCategory = signal<string>('Todos');
  searchTerm = signal<string>('');

  // Pizza Customization
  showHalfAndHalfModal = signal<boolean>(false);
  selectedHalfSize = signal<string>('Grande');
  selectedFlavor1 = signal<Plato | null>(null);
  selectedFlavor2 = signal<Plato | null>(null);

  // Estado del Carrito
  orderItems = signal<WaiterOrderItem[]>([]);
  originalOrderItems = signal<WaiterOrderItem[]>([]);
  orderSubtotal = signal<number>(0);
  orderTotal = signal<number>(0);
  isSubmitting = signal<boolean>(false);

  // Feature 1: Notas Rápidas para Cocina
  readonly NOTAS_RAPIDAS: string[] = [
    'Sin salsas',
    'Sin cebolla',
    'Sin lechuga',
    'Bien Cocido',
    'Termino 3/4',
    'Con todas las salsas',
    'Salsas aparte',
    'Sin tomate',
    'Sin queso',
    'Sin picante',
    'Término medio',
    'Término azul',
    'Empacar para llevar',
    'Bajo en sal',
  ];
  activeNotesItemId = signal<any | null>(null);

  // Estado UI del POS Híbrido y Botonera Compacta
  readonly MENU_SECCIONES = [
    {
      id: 'Todos',
      label: 'Todos',
      icon: 'fas fa-th',
      emoji: '',
      activeClass: 'bg-orange-500 text-white shadow-md shadow-orange-500/20',
    },
    {
      id: 'Parrilla',
      label: 'Parrilla',
      icon: '',
      emoji: '🥩',
      activeClass: 'bg-orange-500 text-white shadow-md shadow-orange-500/20',
    },
    {
      id: 'Pizzas',
      label: 'Pizzas',
      icon: '',
      emoji: '🍕',
      activeClass: 'bg-red-600 text-white shadow-md shadow-red-600/20',
    },
    {
      id: 'Bebidas',
      label: 'Bebidas',
      icon: '',
      emoji: '🥤',
      activeClass: 'bg-sky-600 text-white shadow-md shadow-sky-600/20',
    },
  ] as const;

  readonly PIZZA_SIZES = [
    { key: 'Personal', short: 'P' },
    { key: 'Mediana', short: 'M' },
    { key: 'Grande', short: 'G' },
    { key: 'Extragrande', short: 'EG' },
    { key: 'Gigante', short: 'GG' },
    { key: 'Familiar', short: 'F' },
  ] as const;

  mobileTab = signal<'menu' | 'comanda'>('menu');
  showHeaderActionsMenu = signal<boolean>(false);
  showCategoriesPopover = signal<boolean>(false);
  printConfirmConfig = signal<PrintConfirmConfig | null>(null);

  // Feature 3: Cambio Rápido de Mesa
  showCambiarMesaModal = signal<boolean>(false);
  targetMesaCambio = signal<Mesa | null>(null);

  // Migrar Pedido a Domicilio State
  showMigrarADomicilioModal = signal<boolean>(false);
  barrios = signal<BarrioTarifa[]>([]);
  private _searchTimeout: any;

  migrarForm: FormGroup = this._fb.group({
    cliente_nombre: ['', Validators.required],
    cliente_telefono: ['', Validators.required],
    cliente_direccion: ['', Validators.required],
    cliente_barrio: [''],
    notas: [''],
  });

  private syncInterval?: number;
  private realTimeSub?: any;

  // Computados
  mesasLibresParaCambio = computed(() => {
    const cur = this.selectedMesa();
    return this.mesas().filter(
      (m) => m.estado === 'libre' && (!cur || m.mesa_id !== cur.mesa_id),
    );
  });
  allPizzas = computed(() => {
    return this.menuPlatos().filter((p) => {
      const cat = this.todasLasCategorias().find((c) => c.nombre === p.categoria);
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

  platoQtyMap = computed(() => {
    const map = new Map<string, number>();
    for (const item of this.orderItems()) {
      const rawId = String(item.id ?? '');
      const qty = Number(item.qty) || 0;
      if (!rawId || qty <= 0) continue;
      map.set(rawId, (map.get(rawId) || 0) + qty);
      if (!rawId.startsWith('half-') && rawId.includes('-')) {
        const baseId = rawId.split('-')[0];
        if (baseId) {
          map.set(baseId, (map.get(baseId) || 0) + qty);
        }
      }
    }
    return map;
  });

  pizzaSizeQtyMap = computed(() => {
    const map = new Map<string, number>();
    for (const item of this.orderItems()) {
      const rawId = String(item.id ?? '');
      const qty = Number(item.qty) || 0;
      if (rawId && qty > 0) {
        map.set(rawId, (map.get(rawId) || 0) + qty);
      }
    }
    return map;
  });

  originalQtyMap = computed(() => {
    const map = new Map<string, number>();
    for (const item of this.originalOrderItems()) {
      const key = String(item.id ?? '');
      map.set(key, (map.get(key) || 0) + (Number(item.qty) || 0));
    }
    return map;
  });

  totalOrderUnits = computed(() =>
    this.orderItems().reduce((sum, item) => sum + (Number(item.qty) || 0), 0),
  );

  halfAndHalfInCartCount = computed(() =>
    this.orderItems()
      .filter((item) => String(item.id ?? '').startsWith('half-'))
      .reduce((sum, item) => sum + (Number(item.qty) || 0), 0),
  );

  hasPendingChanges = computed(
    () => JSON.stringify(this.orderItems()) !== JSON.stringify(this.originalOrderItems()),
  );

  private categoriaSeccionMap = computed(() => {
    const map = new Map<string, string>();
    for (const cat of this.todasLasCategorias()) {
      map.set(cat.nombre, cat.seccion || 'Parrilla');
    }
    return map;
  });

  get filteredCategories(): string[] {
    const seccion = this.activeSeccion();
    const allCats = this.todasLasCategorias();

    if (seccion === 'Todos') {
      return ['Todos', ...this.categories().filter((c) => c !== 'Todos')];
    }

    const isParrilla = seccion === 'Parrilla';
    const isPizzas = seccion === 'Pizzas';

    const validCategories = allCats
      .filter((c) =>
        isParrilla
          ? c.seccion === 'Parrilla' || !c.seccion
          : isPizzas
            ? c.seccion === 'Pizzas'
            : c.seccion === 'Bebidas',
      )
      .map((c) => c.nombre);

    return ['Todos', ...this.categories().filter((c) => c !== 'Todos' && validCategories.includes(c))];
  }

  get filteredPlatos(): Plato[] {
    const currentCategory = this.selectedCategory();
    const term = this.searchTerm().trim().toLowerCase();

    let filtered = this.menuPlatos();
    const validCategoryNames = this.filteredCategories;

    if (currentCategory !== 'Todos') {
      filtered = filtered.filter((p) => p.categoria === currentCategory);
    } else if (this.activeSeccion() !== 'Todos') {
      filtered = filtered.filter((p) => p.categoria && validCategoryNames.includes(p.categoria));
    }

    if (term) {
      filtered = filtered.filter((p) =>
        (p.nombre + ' ' + (p.descripcion || '')).toLowerCase().includes(term),
      );
    }

    return filtered;
  }

  get mesasDisponiblesCount(): number {
    return this.mesas().filter((m) => m.estado === 'libre').length;
  }

  get mesasOcupadasCount(): number {
    return this.mesas().filter((m) => m.estado === 'ocupada').length;
  }

  get mesasReservadasCount(): number {
    return this.mesas().filter((m) => m.estado === 'reservada').length;
  }

  get mesasFiltradas(): Mesa[] {
    const filtro = this.filtroUbicacion();
    const list = this.mesas();
    if (filtro === 'Todas') return list;
    if (filtro === 'Salón') return list.filter((m) => m.ubicacion !== 'Barra');
    if (filtro === 'Barra') return list.filter((m) => m.ubicacion === 'Barra');
    if (filtro === 'Libres') return list.filter((m) => m.estado === 'libre');
    if (filtro === 'Ocupadas') return list.filter((m) => m.estado === 'ocupada');
    return list;
  }

  shortId(id: any): string {
    if (!id) return '';
    const str = String(id);
    return str.length > 8 ? str.substring(0, 8) : str;
  }

  onWheelScroll(event: WheelEvent, element: HTMLElement) {
    if (element) {
      event.preventDefault();
      element.scrollLeft += event.deltaY;
    }
  }

  ngOnInit() {
    this.loadData();
    this.loadMenu();

    // 1. Suscripción instantánea a eventos Server-Sent Events (SSE)
    this.realTimeSub = this._pedidosService.getEventsStream().subscribe({
      next: (event) => {
        console.log('[WaiterMesas] Evento en tiempo real recibido:', event?.type);
        if (event?.type === 'platos_changed') {
          this.loadMenu(true);
        } else if (event?.type === 'impresion_fallida') {
          toast.error(
            `⚠️ Error en impresora ${event.data?.tipo || ''} (${event.data?.destino || ''}): ${event.data?.error || 'Revisa papel o conexión'}`,
            { duration: 8000 }
          );
        } else {
          this.silentSync();
        }
      },
      error: (err) => console.warn('[WaiterMesas] SSE reconectando...', err)
    });

    // 2. Sincronización en segundo plano de respaldo cada 3 segundos
    this.syncInterval = window.setInterval(() => {
      this.silentSync();
    }, 3000);
  }

  ngOnDestroy() {
    this.printConfirmConfig.set(null);
    if (this.realTimeSub) {
      this.realTimeSub.unsubscribe();
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }

  loadData(showLoading = true) {
    if (showLoading) this.isLoading.set(true);

    this._mesasService.getAll(true).subscribe({
      next: (mesas) => {
        this._pedidosService.getActive(true).subscribe({
          next: (orders) => {
            this.activeOrdersList.set(orders || []);
            // Sincronizar estado de mesas si tienen pedido activo no completado
            const syncedMesas = (mesas || []).map((m) => {
              const active = (orders || []).find(
                (o) =>
                  this.isSameMesa(o.mesa, m) &&
                  o.estado !== 'Completado' &&
                  o.estado !== 'Cancelado',
              );
              return {
                ...m,
                estado: active ? ('ocupada' as const) : m.estado,
              };
            });
            this.mesas.set(syncedMesas);
            this.isLoading.set(false);
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Error al cargar pedidos activos:', err);
            this.mesas.set(mesas || []);
            this.isLoading.set(false);
            this.cdr.detectChanges();
          },
        });
      },
      error: (err) => {
        console.error('Error al cargar mesas:', err);
        this.isLoading.set(false);
        this.cdr.detectChanges();
      },
    });
  }

  silentSync() {
    // Sincronización silenciosa sin pantalla de carga (consulta mesas y pedidos frescos en paralelo)
    forkJoin({
      mesas: this._mesasService.getAll(true),
      orders: this._pedidosService.getActive(true),
    }).subscribe({
      next: ({ mesas, orders }) => {
        this.activeOrdersList.set(orders || []);
        const syncedMesas = (mesas || []).map((m) => {
          const active = (orders || []).find(
            (o) =>
              this.isSameMesa(o.mesa, m) &&
              o.estado !== 'Completado' &&
              o.estado !== 'Cancelado',
          );
          return {
            ...m,
            estado: active ? ('ocupada' as const) : m.estado,
          };
        });
        this.mesas.set(syncedMesas);

        const curMesa = this.selectedMesa();
        if (curMesa) {
          const freshMesa = syncedMesas.find((m) => m.mesa_id === curMesa.mesa_id);
          if (freshMesa) {
            this.selectedMesa.set(freshMesa);
          }
        }

        // Si el mesero tiene el modal abierto para una mesa, actualizar la orden si cambió o se liberó
        if (curMesa && this.showOrderModal()) {
          const updatedOrder = (orders || []).find(
            (o) =>
              this.isSameMesa(o.mesa, curMesa) &&
              o.estado !== 'Completado' &&
              o.estado !== 'Cancelado',
          );
          const currentItems = this.orderItems();
          const origItems = this.originalOrderItems();
          const isDirty = JSON.stringify(currentItems) !== JSON.stringify(origItems);

          if (updatedOrder) {
            this.activeOrderId.set(updatedOrder.id);
            if (!isDirty) {
              const itemsCopy = JSON.parse(JSON.stringify(updatedOrder.items || []));
              this.orderItems.set(itemsCopy);
              this.originalOrderItems.set(JSON.parse(JSON.stringify(itemsCopy)));
              this.updateTotals();
            }
          } else if (this.activeOrderId()) {
            const label = this.getMesaDisplayLabel(curMesa);
            this.clearDraftForMesa(curMesa.mesa_id);
            this.closeOrderModal();
            toast.info(`${label} fue liberada desde Caja`);
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Silent sync error:', err),
    });
  }

  async loadMenu(forceRefresh: boolean = false) {
    try {
      const [platos, categoriasRes] = await Promise.all([
        firstValueFrom(this._platosService.getAll(forceRefresh)),
        firstValueFrom(this._categoriasService.getAll('menu')),
      ]);
      // Guardar todos los platos en catálogo (incluidos agotados para visibilidad inmediata)
      this.menuPlatos.set(platos || []);
      this.todasLasCategorias.set(categoriasRes.data || []);

      const uniqueCategories = new Set(
        (platos || [])
          .map((p) => p.categoria)
          .filter((c): c is string => !!c),
      );
      this.categories.set(['Todos', ...Array.from(uniqueCategories)]);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading menu:', error);
    }
  }

  isSameMesa(pedidoMesa: any, mesa: Mesa): boolean {
    if (!pedidoMesa || !mesa) return false;
    const pStr = String(pedidoMesa).trim().toLowerCase();
    const mNum = String(mesa.numero).trim().toLowerCase();
    const isMesaBarra = mesa.ubicacion === 'Barra';
    const isPedidoBarra = /^barra\b|^b\d/i.test(pStr);

    if (isMesaBarra !== isPedidoBarra) return false;

    const normP = pStr.replace(/^barra\s*/i, '').replace(/^mesa\s*/i, '').replace(/^b/i, '').trim();
    const normM = mNum.replace(/^barra\s*/i, '').replace(/^mesa\s*/i, '').replace(/^b/i, '').trim();

    return normP.length > 0 && normP === normM;
  }

  getActiveOrderForMesa(mesa: Mesa): Order | undefined {
    return (this.activeOrdersList() || []).find(
      (o) =>
        this.isSameMesa(o.mesa, mesa) &&
        o.estado !== 'Completado' &&
        o.estado !== 'Cancelado',
    );
  }

  private getDraftKey(mesaId: number): string {
    return `restausync_waiter_draft_mesa_${mesaId}`;
  }

  private getDraftForMesa(mesaId: number): any | null {
    try {
      const raw = localStorage.getItem(this.getDraftKey(mesaId));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public clearDraftForMesa(mesaId: number) {
    try {
      localStorage.removeItem(this.getDraftKey(mesaId));
    } catch (e) {
      console.error('Error limpiando borrador:', e);
    }
  }

  public saveDraftForCurrentMesa() {
    const mesa = this.selectedMesa();
    if (!mesa) return;
    const items = this.orderItems();
    const orig = this.originalOrderItems();

    // Si no hay items, limpiar el borrador
    if (!items || items.length === 0) {
      this.clearDraftForMesa(mesa.mesa_id);
      return;
    }

    // Solo guardar si hay ítems nuevos o diferencias con la orden ya enviada
    const isDirty = JSON.stringify(items) !== JSON.stringify(orig);
    if (!isDirty && this.activeOrderId()) {
      this.clearDraftForMesa(mesa.mesa_id);
      return;
    }

    try {
      const draft = {
        mesa_id: mesa.mesa_id,
        mesa_numero: mesa.numero,
        items,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(this.getDraftKey(mesa.mesa_id), JSON.stringify(draft));
    } catch (e) {
      console.error('Error guardando borrador:', e);
    }
  }

  descartarBorradorActual() {
    this.showHeaderActionsMenu.set(false);
    const mesa = this.selectedMesa();
    if (!mesa) return;
    this.clearDraftForMesa(mesa.mesa_id);
    const orig = this.originalOrderItems();
    this.orderItems.set(JSON.parse(JSON.stringify(orig)));
    this.updateTotals();
    toast.info('Borrador descartado correctamente.');
    this.cdr.detectChanges();
  }

  openOrderModal(mesa: Mesa) {
    this.selectedMesa.set(mesa);
    this.showOrderModal.set(true);
    this.showHeaderActionsMenu.set(false);
    this.showCategoriesPopover.set(false);
    this.activeNotesItemId.set(null);

    const activeOrder = this.getActiveOrderForMesa(mesa);
    const savedDraft = this.getDraftForMesa(mesa.mesa_id);

    if (activeOrder) {
      this.activeOrderId.set(activeOrder.id);
      this.mobileTab.set('comanda');
      const itemsCopy = JSON.parse(JSON.stringify(activeOrder.items || []));
      this.originalOrderItems.set(JSON.parse(JSON.stringify(itemsCopy)));

      // Si existe un borrador con más ítems o adiciones sin guardar
      if (savedDraft && Array.isArray(savedDraft.items) && savedDraft.items.length > itemsCopy.length) {
        this.orderItems.set(savedDraft.items);
        toast.info(`📝 Borrador recuperado (${savedDraft.items.length} ítems)`, { duration: 2200 });
      } else {
        this.orderItems.set(itemsCopy);
      }
    } else {
      this.activeOrderId.set(null);
      this.mobileTab.set('menu');
      this.originalOrderItems.set([]);

      // Si la mesa está libre pero tenía un borrador en proceso
      if (savedDraft && Array.isArray(savedDraft.items) && savedDraft.items.length > 0) {
        this.orderItems.set(savedDraft.items);
        toast.info(`📝 Borrador restaurado (${savedDraft.items.length} ítems)`, { duration: 2200 });
      } else {
        this.orderItems.set([]);
      }
    }

    this.updateTotals();
    this.cdr.detectChanges();
  }

  closeOrderModal() {
    this.showOrderModal.set(false);
    this.mobileTab.set('menu');
    this.showHeaderActionsMenu.set(false);
    this.showCategoriesPopover.set(false);
    this.printConfirmConfig.set(null);
    this.activeNotesItemId.set(null);
    this.selectedMesa.set(null);
    this.activeOrderId.set(null);
    this.orderItems.set([]);
    this.originalOrderItems.set([]);
    this.cdr.detectChanges();
  }

  private getMesaDisplayLabel(mesa: Mesa): string {
    return mesa.ubicacion === 'Barra' ? `Barra B${mesa.numero}` : `Mesa M${mesa.numero}`;
  }

  private formatCop(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  }

  openPrintConfirm(config: PrintConfirmConfig) {
    this.printConfirmConfig.set(config);
    this.cdr.detectChanges();
  }

  cancelPrintConfirm() {
    this.printConfirmConfig.set(null);
    this.cdr.detectChanges();
  }

  executePrintConfirm() {
    const cfg = this.printConfirmConfig();
    if (!cfg) return;
    this.printConfirmConfig.set(null);
    cfg.onConfirm();
  }

  selectCategory(category: string) {
    this.selectedCategory.set(category);
    this.showCategoriesPopover.set(false);
  }

  getPlatoQty(platoId: number): number {
    return this.platoQtyMap().get(String(platoId)) || 0;
  }

  getPizzaSizeQty(platoId: number, size: string): number {
    return this.pizzaSizeQtyMap().get(`${platoId}-${size}`) || 0;
  }

  getItemDeltaQty(item: WaiterOrderItem): number {
    const origQty = this.originalQtyMap().get(String(item.id ?? '')) || 0;
    return Math.max(0, (Number(item.qty) || 0) - origQty);
  }

  getPlatoSection(plato: Plato): 'Parrilla' | 'Pizzas' | 'Bebidas' {
    const catName = plato.categoria || '';
    const mapped = this.categoriaSeccionMap().get(catName);
    if (mapped === 'Pizzas' || catName.toLowerCase().includes('pizza')) return 'Pizzas';
    if (mapped === 'Bebidas') return 'Bebidas';
    return 'Parrilla';
  }

  getCategoryCount(categoria: string): number {
    if (categoria === 'Todos') {
      if (this.activeSeccion() === 'Todos') return this.menuPlatos().length;
      const validCats = this.filteredCategories;
      return this.menuPlatos().filter((p) => p.categoria && validCats.includes(p.categoria)).length;
    }
    return this.menuPlatos().filter((p) => p.categoria === categoria).length;
  }

  isPizzaPlato(plato: Plato): boolean {
    if (!plato || !plato.categoria) return false;
    const cat = this.todasLasCategorias().find((c) => c.nombre === plato.categoria);
    return cat?.seccion === 'Pizzas' || plato.categoria.toLowerCase().includes('pizza');
  }

  getPizzaPrice(plato: Plato, size: string): number {
    let pxt = plato.precios_por_tamano;
    if (pxt && typeof pxt === 'string') {
      try {
        pxt = JSON.parse(pxt);
      } catch (e) {
        console.error('Error parsing precios_por_tamano:', e);
      }
    }
    if (pxt && typeof pxt === 'object' && pxt[size]) {
      return Number(pxt[size]);
    }
    const base = plato.precio;
    switch (size) {
      case 'Personal':
        return Math.round(base * 0.7);
      case 'Mediana':
        return base;
      case 'Grande':
        return Math.round(base * 1.3);
      case 'Extragrande':
        return Math.round(base * 1.6);
      case 'Gigante':
        return Math.round(base * 1.9);
      case 'Familiar':
        return Math.round(base * 2.2);
      default:
        return base;
    }
  }

  cleanPizzaName(nombre: string): string {
    return nombre
      .replace(/\s+(Mediana|Familiar|Personal|Grande|Extragrande|Gigante)$/i, '')
      .replace(/^Pizza\s+/i, '')
      .trim();
  }

  addPizzaWithSize(plato: Plato, size: string, event?: Event) {
    if (event) event.stopPropagation();
    if (!plato.disponible) return;

    const price = this.getPizzaPrice(plato, size);
    const cleanedName = this.cleanPizzaName(plato.nombre);
    const name = `${cleanedName} (${size})`;

    const items = [...this.orderItems()];
    const id = `${plato.plato_id}-${size}`;
    const existing = items.find((i) => i.id === id);

    const categoriaDef = this.todasLasCategorias().find((c) => c.nombre === plato.categoria);
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
        tipoEntrega: 'mesa',
      });
    }
    this.orderItems.set(items);
    this.updateTotals();
    toast.success(`+1 ${name}`);
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
    const existing = items.find((i) => i.id === id);

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
        tipoEntrega: 'mesa',
      });
    }
    this.orderItems.set(items);
    this.updateTotals();
    this.showHalfAndHalfModal.set(false);
    this.selectedFlavor1.set(null);
    this.selectedFlavor2.set(null);
    toast.success(`+1 ${name}`);
  }

  addPlato(plato: Plato) {
    if (!plato || !plato.disponible) return;
    const items = [...this.orderItems()];
    const targetId = String(plato.plato_id);
    const existing = items.find((i) => String(i.id) === targetId);

    const categoriaDef = this.todasLasCategorias().find((c) => c.nombre === plato.categoria);
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
        tipoEntrega: 'mesa',
      });
    }
    this.orderItems.set(items);
    this.updateTotals();
    toast.success(`+1 ${plato.nombre}`);
  }

  removePlato(platoId: any) {
    const items = [...this.orderItems()];
    const targetId = String(platoId);
    const existing = items.find((i) => String(i.id) === targetId);
    if (existing) {
      if (existing.qty > 1) {
        existing.qty -= 1;
      } else {
        const index = items.indexOf(existing);
        items.splice(index, 1);
        if (String(this.activeNotesItemId()) === targetId) {
          this.activeNotesItemId.set(null);
        }
      }
    }
    this.orderItems.set(items);
    this.updateTotals();
  }

  incrementQty(platoId: any) {
    const items = [...this.orderItems()];
    const targetId = String(platoId);
    const existing = items.find((i) => String(i.id) === targetId);
    if (existing) {
      existing.qty += 1;
      this.orderItems.set(items);
      this.updateTotals();
    }
  }

  updateItemOption(platoId: any, option: 'tipoEntrega' | 'notas', value: any) {
    const targetId = String(platoId);
    const items = this.orderItems().map((item) =>
      String(item.id) === targetId ? { ...item, [option]: value } : item,
    );
    this.orderItems.set(items);
  }

  // Métodos de Feature 1: Notas Rápidas para Cocina
  toggleNotesItem(itemId: any) {
    if (this.activeNotesItemId() === itemId) {
      this.activeNotesItemId.set(null);
    } else {
      this.activeNotesItemId.set(itemId);
    }
  }

  hasNota(itemId: any, nota: string): boolean {
    const item = this.orderItems().find((i) => String(i.id) === String(itemId));
    if (!item || !item.notas) return false;
    const current = item.notas.toLowerCase();
    return current.includes(nota.toLowerCase());
  }

  toggleNotaRapida(itemId: any, nota: string) {
    const items = [...this.orderItems()];
    const target = items.find((i) => String(i.id) === String(itemId));
    if (!target) return;

    let partes = (target.notas || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const index = partes.findIndex((p) => p.toLowerCase() === nota.toLowerCase());

    if (index >= 0) {
      partes.splice(index, 1);
    } else {
      partes.push(nota);
    }

    target.notas = partes.join(', ');
    this.orderItems.set(items);
    this.cdr.detectChanges();
  }

  clearNotas(itemId: any) {
    const items = [...this.orderItems()];
    const target = items.find((i) => String(i.id) === String(itemId));
    if (target) {
      target.notas = '';
      this.orderItems.set(items);
      this.cdr.detectChanges();
    }
  }

  // Métodos de Feature 3: Cambio Rápido de Mesa
  openCambiarMesaModal() {
    this.showHeaderActionsMenu.set(false);
    this.targetMesaCambio.set(null);
    this.showCambiarMesaModal.set(true);
    this.cdr.detectChanges();
  }

  closeCambiarMesaModal() {
    this.showCambiarMesaModal.set(false);
    this.targetMesaCambio.set(null);
    this.cdr.detectChanges();
  }

  seleccionarMesaTarget(mesa: Mesa) {
    this.targetMesaCambio.set(mesa);
    this.cdr.detectChanges();
  }

  confirmarCambioDeMesa() {
    const currentMesa = this.selectedMesa();
    const targetMesa = this.targetMesaCambio();
    const orderId = this.activeOrderId();

    if (!currentMesa || !targetMesa || !orderId) return;

    const oldLabel =
      currentMesa.ubicacion === 'Barra'
        ? `Barra B${currentMesa.numero}`
        : `Mesa ${currentMesa.numero}`;
    const newLabel =
      targetMesa.ubicacion === 'Barra'
        ? `Barra B${targetMesa.numero}`
        : `Mesa ${targetMesa.numero}`;
    const newMesaName =
      targetMesa.ubicacion === 'Barra'
        ? `BARRA ${targetMesa.numero}`
        : `${targetMesa.numero}`;

    const payload: Partial<Order> = {
      mesa: newMesaName,
      ubicacion: targetMesa.ubicacion || 'Salón',
      tipo: targetMesa.ubicacion === 'Barra' ? 'Barra' : 'Mesa',
      cliente_nombre:
        targetMesa.ubicacion === 'Barra'
          ? `Cliente BARRA ${targetMesa.numero}`
          : 'Cliente Mesa',
    };

    this.isSubmitting.set(true);
    this._pedidosService.update(String(orderId), payload).subscribe({
      next: () => {
        // 1. Liberar mesa origen
        this._mesasService.cambiarEstado(currentMesa.mesa_id, 'libre').subscribe({
          next: () => {
            // 2. Ocupar mesa destino
            this._mesasService.cambiarEstado(targetMesa.mesa_id, 'ocupada').subscribe({
              next: () => {
                this.isSubmitting.set(false);
                this.closeCambiarMesaModal();
                this.selectedMesa.set(targetMesa);
                this.loadData(false);
                toast.success(
                  `✅ Pedido trasladado exitosamente de ${oldLabel} a ${newLabel}.`,
                );
              },
              error: (err) => {
                this.isSubmitting.set(false);
                console.error('Error ocupando mesa destino:', err);
                toast.error('Error al actualizar estado de la nueva mesa');
              },
            });
          },
          error: (err) => {
            this.isSubmitting.set(false);
            console.error('Error liberando mesa origen:', err);
            toast.error('Error al liberar la mesa anterior');
          },
        });
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        console.error('Error trasladando pedido de mesa:', err);
        toast.error(err.error?.message || 'Error al cambiar el pedido de mesa');
      },
    });
  }

  // Métodos de Migrar a Domicilio
  loadBarrios() {
    this._barriosService.getAll().subscribe({
      next: (res: any) => this.barrios.set(res.data || res || []),
      error: (err: any) => console.error('Error cargando barrios:', err),
    });
  }

  openMigrarADomicilioModal() {
    this.showHeaderActionsMenu.set(false);
    this.migrarForm.reset();
    this.loadBarrios();
    this.showMigrarADomicilioModal.set(true);
    this.cdr.detectChanges();
  }

  closeMigrarADomicilioModal() {
    this.showMigrarADomicilioModal.set(false);
    this.migrarForm.reset();
    this.cdr.detectChanges();
  }

  searchClientByPhone(event: Event) {
    const input = event.target as HTMLInputElement;
    const telefono = normalizePhone(input.value);

    if (this._searchTimeout) clearTimeout(this._searchTimeout);
    if (telefono.length < MIN_PHONE_DIGITS) return;

    this._searchTimeout = setTimeout(() => {
      this._clientesService.getClientes().subscribe((clientes) => {
        if (normalizePhone(this.migrarForm.get('cliente_telefono')?.value) !== telefono) return;
        // Coincidencia EXACTA del teléfono (evita traer la dirección de otro cliente)
        const cliente: any = findClienteByPhone(clientes, telefono);
        if (cliente) {
          this.migrarForm.patchValue({
            cliente_nombre: cliente.nombre || '',
            cliente_direccion: cliente.direccion || '',
            cliente_barrio: cliente.barrio || '',
          });
          this.cdr.detectChanges();
        }
      });
    }, 300);
  }

  confirmarMigracionADomicilio() {
    if (this.migrarForm.invalid) {
      toast.error('Completa Nombre, Teléfono y Dirección del cliente.');
      return;
    }

    const currentItems = this.orderItems();
    if (!currentItems || currentItems.length === 0) {
      toast.error('Agrega al menos un platillo al pedido antes de migrar.');
      return;
    }

    const currentMesa = this.selectedMesa();
    const clientData = this.migrarForm.value;
    const mesaLabel = currentMesa ? this.getMesaDisplayLabel(currentMesa) : 'Mesa';
    const subtotal = currentItems.reduce(
      (sum, item) => sum + (Number(item.precio) || 0) * (Number(item.qty) || 1),
      0,
    );

    this.openPrintConfirm({
      title: '¿Confirmar migración e impresión a domicilio?',
      message: `Se trasladará el pedido de ${mesaLabel} a Domicilio para ${clientData.cliente_nombre} (${this.formatCop(subtotal)}) y se enviará la comanda a la impresora.`,
      printerLabel: 'Impresión Domicilios',
      confirmLabel: 'Sí, Migrar e Imprimir',
      accent: 'cyan',
      onConfirm: () => this.executeMigracionADomicilio(),
    });
  }

  private executeMigracionADomicilio() {
    if (this.migrarForm.invalid) {
      toast.error('Completa Nombre, Teléfono y Dirección del cliente.');
      return;
    }

    const currentItems = this.orderItems();
    if (!currentItems || currentItems.length === 0) {
      toast.error('Agrega al menos un platillo al pedido antes de migrar.');
      return;
    }

    const orderId = this.activeOrderId();
    const currentMesa = this.selectedMesa();
    const clientData = this.migrarForm.value;
    const mesaLabel = currentMesa
      ? currentMesa.ubicacion === 'Barra'
        ? `Barra B${currentMesa.numero}`
        : `Mesa ${currentMesa.numero}`
      : 'Mesa';

    const subtotal = currentItems.reduce(
      (sum, item) => sum + (Number(item.precio) || 0) * (Number(item.qty) || 1),
      0,
    );

    // Guardar / actualizar cliente frecuente en segundo plano
    this._clientesService
      .createCliente({
        nombre: clientData.cliente_nombre,
        telefono: clientData.cliente_telefono,
        direccion: clientData.cliente_direccion,
        barrio: clientData.cliente_barrio || '',
      })
      .subscribe({
        next: () => {},
        error: (err: any) => console.error('Error guardando cliente:', err),
      });

    this.isSubmitting.set(true);

    const formattedItems = this.buildFormattedItems(currentItems, 'llevar');

    if (orderId) {
      // CASO 1: El pedido ya existía en la base de datos
      const payload: Partial<Order> = {
        tipo: 'Domicilio',
        mesa: 'Domicilio',
        ubicacion: 'Domicilio',
        cliente_nombre: clientData.cliente_nombre,
        cliente_telefono: clientData.cliente_telefono,
        cliente_direccion: clientData.cliente_direccion,
        cliente_barrio: clientData.cliente_barrio || '',
        notas: clientData.notas || '',
        items: formattedItems,
        subtotal: subtotal,
        total: subtotal,
      };

      this._pedidosService.update(String(orderId), payload).subscribe({
        next: () => {
          if (currentMesa) {
            this._mesasService.cambiarEstado(currentMesa.mesa_id, 'libre').subscribe({
              next: () => {
                this.isSubmitting.set(false);
                this.closeMigrarADomicilioModal();
                this.closeOrderModal();
                this.loadData(false);
                toast.success(
                  `🛵 Pedido migrado exitosamente a DOMICILIO para ${clientData.cliente_nombre}. ${mesaLabel} ha sido LIBERADA.`,
                );
              },
              error: (err: any) => {
                this.isSubmitting.set(false);
                console.error('Error liberando mesa:', err);
                toast.success('Pedido migrado a domicilio.');
                this.closeMigrarADomicilioModal();
                this.closeOrderModal();
                this.loadData(false);
              },
            });
          } else {
            this.isSubmitting.set(false);
            this.closeMigrarADomicilioModal();
            this.closeOrderModal();
            this.loadData(false);
            toast.success(`🛵 Pedido migrado exitosamente a DOMICILIO.`);
          }
        },
        error: (err: any) => {
          this.isSubmitting.set(false);
          console.error('Error migrando pedido a domicilio:', err);
          toast.error(err.error?.message || 'Error al migrar el pedido a domicilio');
        },
      });
    } else {
      // CASO 2: El pedido se estaba armando en la mesa y aún no se había guardado
      const currentUser = this.authService.user();
      const currentUserName = currentUser
        ? `${currentUser.name} ${currentUser.surname || ''}`.trim()
        : 'Mesero';
      const currentUserId = currentUser?.id;

      const payload: any = {
        tipo: 'Domicilio',
        mesa: 'Domicilio',
        ubicacion: 'Domicilio',
        cliente_nombre: clientData.cliente_nombre,
        cliente_telefono: clientData.cliente_telefono,
        cliente_direccion: clientData.cliente_direccion,
        cliente_barrio: clientData.cliente_barrio || '',
        estado: 'Recibido',
        mesero: currentUserName,
        usuario_id: currentUserId,
        subtotal: subtotal,
        impuesto_valor: 0,
        propina_valor: 0,
        total: subtotal,
        items: formattedItems,
        notas: clientData.notas || '',
      };

      this._pedidosService.createPedido(payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeMigrarADomicilioModal();
          this.closeOrderModal();
          this.loadData(false);
          toast.success(
            `🛵 Pedido registrado directamente como DOMICILIO para ${clientData.cliente_nombre}. ${mesaLabel} permanece LIBRE.`,
          );
        },
        error: (err: any) => {
          this.isSubmitting.set(false);
          console.error(err);
          toast.error(err.error?.message || 'Error al registrar pedido a domicilio');
        },
      });
    }
  }

  updateTotals() {
    const subtotal = this.orderItems().reduce(
      (sum, item) => sum + (Number(item.precio) || 0) * (Number(item.qty) || 1),
      0,
    );
    this.orderSubtotal.set(subtotal);
    this.orderTotal.set(subtotal);
    this.saveDraftForCurrentMesa();
  }

  calculateNewItems(original: any[], current: any[]): any[] {
    const newItems: any[] = [];
    for (const item of current) {
      const itemKey = `${item.id || item.nombre}_${item.notas || ''}_${item.tipoEntrega || 'mesa'}`;
      const origMatch = (original || []).find(
        (o) =>
          `${o.id || o.nombre}_${o.notas || ''}_${o.tipoEntrega || 'mesa'}` === itemKey,
      );
      const origQty = origMatch ? Number(origMatch.qty || 0) : 0;
      const diffQty = Number(item.qty || 0) - origQty;
      if (diffQty > 0) {
        newItems.push({
          ...item,
          qty: diffQty,
        });
      }
    }
    return newItems;
  }

  private buildFormattedItems(items: WaiterOrderItem[], forceTipoEntrega?: 'mesa' | 'llevar') {
    return items.map((i) => ({
      id: String(i.id),
      nombre: i.nombre,
      precio: Number(i.precio) || 0,
      qty: Number(i.qty) || 1,
      seccion: i.seccion || i.categoria || '',
      categoria: i.categoria || i.seccion || '',
      tipoEntrega: forceTipoEntrega || i.tipoEntrega || 'mesa',
      notas: i.notas || '',
    }));
  }

  guardarYOcuparMesa(skipPrint: boolean = false) {
    const mesa = this.selectedMesa();
    if (!mesa) return;

    const items = this.orderItems();
    if (items.length === 0) {
      toast.error('Agrega al menos un platillo al pedido.');
      return;
    }

    if (skipPrint) {
      this.executeGuardarYOcuparMesa(true);
      return;
    }

    const currentId = this.activeOrderId();
    const mesaLabel = this.getMesaDisplayLabel(mesa);

    if (currentId) {
      const formattedItems = this.buildFormattedItems(items);
      const newItems = this.calculateNewItems(this.originalOrderItems(), formattedItems);
      const newUnits = newItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

      this.openPrintConfirm({
        title: '¿Enviar adición e imprimir en cocina?',
        message:
          newUnits > 0
            ? `Se actualizará ${mesaLabel} y se enviarán a imprimir ${newUnits} ${newUnits === 1 ? 'producto nuevo' : 'productos nuevos'} en cocina.`
            : `Se actualizará la comanda de ${mesaLabel} (${this.totalOrderUnits()} uds · ${this.formatCop(this.orderTotal())}).`,
        printerLabel: 'Impresoras de Cocina',
        confirmLabel: 'Sí, Enviar e Imprimir',
        accent: 'orange',
        onConfirm: () => this.executeGuardarYOcuparMesa(false),
      });
    } else {
      const units = this.totalOrderUnits();
      this.openPrintConfirm({
        title: '¿Enviar comanda e imprimir en cocina?',
        message: `Se ocupará ${mesaLabel} con ${units} ${units === 1 ? 'unidad' : 'unidades'} (${this.formatCop(this.orderTotal())}) y se enviará la comanda a cocina.`,
        printerLabel: 'Impresoras de Cocina',
        confirmLabel: 'Sí, Enviar e Imprimir',
        accent: 'emerald',
        onConfirm: () => this.executeGuardarYOcuparMesa(false),
      });
    }
  }

  private executeGuardarYOcuparMesa(skipPrint: boolean = false) {
    const mesa = this.selectedMesa();
    if (!mesa) return;

    const items = this.orderItems();
    if (items.length === 0) {
      toast.error('Agrega al menos un platillo al pedido.');
      return;
    }

    const currentId = this.activeOrderId();
    const esBarra = mesa.ubicacion === 'Barra';
    const mesaNombre = esBarra ? `BARRA ${mesa.numero}` : mesa.numero.toString();

    const currentUser = this.authService.user();
    const currentUserName = currentUser
      ? `${currentUser.name} ${currentUser.surname || ''}`.trim()
      : 'Mesero';
    const currentUserId = currentUser?.id;

    const formattedItems = this.buildFormattedItems(items);

    const payload: any = {
      tipo: esBarra ? 'Barra' : 'Mesa',
      mesa: mesaNombre,
      ubicacion: mesa.ubicacion || 'Salón',
      cliente_nombre: esBarra ? `Cliente BARRA ${mesa.numero}` : 'Cliente Mesa',
      estado: 'Recibido',
      mesero: currentUserName,
      usuario_id: currentUserId,
      subtotal: this.orderSubtotal(),
      impuesto_valor: 0,
      propina_valor: 0,
      total: this.orderTotal(),
      items: formattedItems,
      autoPrint: !skipPrint,
    };

    this.isSubmitting.set(true);

    if (currentId) {
      // ADICIÓN A PEDIDO EXISTENTE
      const newItems = this.calculateNewItems(this.originalOrderItems(), formattedItems);
      this._pedidosService.update(currentId, { ...payload, newItemsToPrint: newItems }).subscribe({
        next: (order: any) => {
          this.isSubmitting.set(false);
          this.onOrderSavedYOcupar(mesa, order, formattedItems, newItems, mesaNombre, esBarra, true, skipPrint);
        },
        error: (err: any) => {
          this.isSubmitting.set(false);
          console.error(err);
          toast.error(err.error?.message || 'Error al actualizar el pedido');
        },
      });
    } else {
      // NUEVO PEDIDO
      this._pedidosService.createPedido(payload).subscribe({
        next: (created: any) => {
          this.isSubmitting.set(false);
          this.activeOrderId.set(created.id);
          this.onOrderSavedYOcupar(mesa, created, formattedItems, formattedItems, mesaNombre, esBarra, false, skipPrint);
        },
        error: (err: any) => {
          this.isSubmitting.set(false);
          console.error(err);
          toast.error(err.error?.message || 'Error al registrar pedido y ocupar mesa');
        },
      });
    }
  }

  private onOrderSavedYOcupar(
    mesa: Mesa,
    order: any,
    allItems: any[],
    newItemsToPrint: any[],
    mesaNombre: string,
    esBarra: boolean,
    isUpdate: boolean,
    skipPrint: boolean = false,
  ) {
    const currentUser = this.authService.user();
    const currentUserName = currentUser
      ? `${currentUser.name} ${currentUser.surname || ''}`.trim()
      : 'Mesero';

    const pedidoInfo = {
      id: order.id,
      orderNumber: order.orderNumber,
      mesa: mesaNombre,
      ubicacion: mesa.ubicacion || 'Salón',
      tipo: esBarra ? 'Barra' : 'Mesa',
      esAdicion: isUpdate,
      mesero: order.mesero || currentUserName,
    };

    if (skipPrint) {
      console.log('[WaiterMesas] Impresión de comanda omitida por solicitud del usuario (skipPrint=true).');
    } else {
      console.log('[WaiterMesas] Comanda gestionada de forma automática por el backend.');
    }

    this.clearDraftForMesa(mesa.mesa_id);

    if (mesa.estado !== 'ocupada') {
      this._mesasService.cambiarEstado(mesa.mesa_id, 'ocupada').subscribe({
        next: () => {
          this.loadData(false);
          this.closeOrderModal();
          const printStatusMsg = skipPrint ? '(sin imprimir)' : 'enviado a cocina';
          toast.success(
            `🚀 Pedido registrado ${printStatusMsg}. ${esBarra ? 'La barra' : 'La mesa'} M${mesa.numero} está OCUPADA.`,
          );
        },
        error: (err) => {
          console.error(err);
          this.loadData(false);
          this.closeOrderModal();
        },
      });
    } else {
      this.loadData(false);
      this.closeOrderModal();
      toast.success(
        `✅ Adición guardada y enviada a cocina para ${esBarra ? 'Barra' : 'Mesa'} M${mesa.numero}.`,
      );
    }
  }

  imprimirPrecuentaMesaActual() {
    const mesa = this.selectedMesa();
    const items = this.orderItems();
    if (!mesa) return;
    if (items.length === 0) {
      toast.error('No hay platillos en la comanda para imprimir la pre-cuenta.');
      return;
    }

    const mesaLabel = this.getMesaDisplayLabel(mesa);
    this.openPrintConfirm({
      title: '¿Imprimir pre-cuenta?',
      message: `Se enviará la pre-cuenta informativa de ${mesaLabel} (${this.formatCop(this.orderTotal())}) a la impresora de Caja.`,
      printerLabel: 'Impresora de Caja',
      confirmLabel: 'Sí, Imprimir Pre-cuenta',
      accent: 'emerald',
      onConfirm: () => this.executeImprimirPrecuentaMesaActual(),
    });
  }

  private executeImprimirPrecuentaMesaActual() {
    const mesa = this.selectedMesa();
    const items = this.orderItems();
    if (!mesa || items.length === 0) return;

    const activeOrder = this.getActiveOrderForMesa(mesa);
    const mesaNombre = mesa.ubicacion === 'Barra' ? `BARRA ${mesa.numero}` : mesa.numero.toString();
    const currentUser = this.authService.user();
    const currentUserName = currentUser ? `${currentUser.name} ${currentUser.surname || ''}`.trim() : 'Mesero';

    const pedidoInfo = {
      id: this.activeOrderId() || activeOrder?.id,
      orderNumber: activeOrder?.orderNumber,
      mesa: mesaNombre,
      ubicacion: mesa.ubicacion || 'Salón',
      tipo: mesa.ubicacion === 'Barra' ? 'Barra' : 'Mesa',
      subtotal: this.orderSubtotal(),
      total: this.orderTotal(),
      cliente_nombre: activeOrder?.cliente_nombre || 'Cliente Mesa',
      mesero: activeOrder?.mesero || currentUserName,
      items: items,
    };

    this._mesasService.imprimirPrecuenta(pedidoInfo).subscribe({
      next: () => toast.success(`🧾 Pre-cuenta de ${mesaNombre} enviada a la impresora principal.`),
      error: (err: any) => {
        console.error('Error al imprimir pre-cuenta:', err);
        toast.error('Error al enviar la pre-cuenta a la impresora principal.');
      },
    });
  }

  reimprimirTicketMesaActual() {
    const mesa = this.selectedMesa();
    const orderId = this.activeOrderId();
    if (!mesa || !orderId) return;

    const mesaLabel = this.getMesaDisplayLabel(mesa);
    this.openPrintConfirm({
      title: '¿Reimprimir ticket de comanda?',
      message: `Se enviará una copia de la comanda #${this.shortId(orderId)} de ${mesaLabel} a la impresora.`,
      printerLabel: 'Impresora de Comanda',
      confirmLabel: 'Sí, Reimprimir',
      accent: 'blue',
      onConfirm: () => this.executeReimprimirTicketMesaActual(),
    });
  }

  private executeReimprimirTicketMesaActual() {
    const mesa = this.selectedMesa();
    const orderId = this.activeOrderId();
    if (!mesa || !orderId) return;

    const activeOrder = this.getActiveOrderForMesa(mesa);
    const mesaNombre = mesa.ubicacion === 'Barra' ? `BARRA ${mesa.numero}` : mesa.numero.toString();
    const itemsToPrint = activeOrder?.items || this.orderItems();

    const pedidoInfo = {
      id: orderId,
      orderNumber: activeOrder?.orderNumber,
      mesa: mesaNombre,
      ubicacion: mesa.ubicacion || 'Salón',
      tipo: mesa.ubicacion === 'Barra' ? 'Barra' : 'Mesa',
      subtotal: activeOrder?.subtotal || this.orderSubtotal(),
      total: activeOrder?.total || this.orderTotal(),
      cliente_nombre: activeOrder?.cliente_nombre || 'Cliente Mesa',
      mesero: activeOrder?.mesero || this.authService.user()?.name,
      items: itemsToPrint,
      esReimpresion: true,
    };

    this._mesasService.confirmarPedido(pedidoInfo, itemsToPrint).subscribe({
      next: () => toast.success('Comanda de cocina enviada a reimpresión'),
      error: () => toast.error('Error al reimprimir comanda de cocina'),
    });
  }

  reimprimirTicketDesdeMapa(mesa: Mesa, event: Event) {
    event.stopPropagation();
    const activeOrder = this.getActiveOrderForMesa(mesa);
    if (!activeOrder) {
      toast.error('No se encontró pedido activo para esta mesa');
      return;
    }

    const mesaLabel = this.getMesaDisplayLabel(mesa);
    const itemsCount = (activeOrder.items || []).length;
    this.openPrintConfirm({
      title: '¿Reimprimir comanda de mesa?',
      message: `Se enviará una copia de la comanda de ${mesaLabel} (${itemsCount} ${itemsCount === 1 ? 'producto' : 'productos'} · ${this.formatCop(activeOrder.total || 0)}) a la impresora.`,
      printerLabel: 'Impresoras de Cocina',
      confirmLabel: 'Sí, Reimprimir',
      accent: 'blue',
      onConfirm: () => this.executeReimprimirTicketDesdeMapa(mesa, activeOrder),
    });
  }

  private executeReimprimirTicketDesdeMapa(mesa: Mesa, activeOrder: Order) {
    const mesaNombre = mesa.ubicacion === 'Barra' ? `BARRA ${mesa.numero}` : mesa.numero.toString();
    const itemsToPrint = activeOrder.items || [];
    const pedidoInfo = {
      id: activeOrder.id,
      orderNumber: activeOrder.orderNumber,
      mesa: mesaNombre,
      ubicacion: mesa.ubicacion || 'Salón',
      tipo: mesa.ubicacion === 'Barra' ? 'Barra' : 'Mesa',
      subtotal: activeOrder.subtotal,
      total: activeOrder.total,
      cliente_nombre: activeOrder.cliente_nombre || 'Cliente Mesa',
      mesero: activeOrder.mesero || this.authService.user()?.name,
      items: itemsToPrint,
      esReimpresion: true,
    };

    this._mesasService.confirmarPedido(pedidoInfo, itemsToPrint).subscribe({
      next: () => toast.success(`Comanda de ${mesaNombre} reimpresa en cocina`),
      error: () => toast.error('Error al reimprimir comanda'),
    });
  }
}

export default WaiterMesasPageComponent;
