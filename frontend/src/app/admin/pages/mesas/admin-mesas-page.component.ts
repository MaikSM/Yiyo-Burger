import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { rxResource } from '@angular/core/rxjs-interop';
import { MesasService, CreateMesa, Mesa } from '@admin/services/mesas.service';
import { PlatosService, Plato } from '@admin/services/platos.service';
import { CategoriasService, Categoria } from '@admin/services/categorias.service';
import { PedidosService } from '@admin/services/pedidos.service';
import { CierreCajaService } from '@admin/services/cierre-caja.service';
import { ClientesService } from '@admin/services/clientes.service';
import { BarriosService, BarrioTarifa } from '@admin/services/barrios.service';
import { AuthService } from '@auth/services/auth.service';
import { firstValueFrom, forkJoin, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

interface OrderItem {
  id: any;
  nombre: string;
  precio: number;
  qty: number;
  seccion?: string;
  categoria?: string;
  tipoEntrega?: 'mesa' | 'llevar';
  notas?: string;
}

@Component({
  selector: 'admin-mesas-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-mesas-page.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMesasPageComponent implements OnInit, OnDestroy {
  private _mesasService = inject(MesasService);
  private _platosService = inject(PlatosService);
  private _categoriasService = inject(CategoriasService);
  private _fb = inject(FormBuilder);
  private _pedidosService = inject(PedidosService);
  private _cierreCajaService = inject(CierreCajaService);
  private _clientesService = inject(ClientesService);
  private _barriosService = inject(BarriosService);
  private _authService = inject(AuthService);
  private _cdr = inject(ChangeDetectorRef);

  private realTimeSub?: Subscription;
  private syncInterval?: any;

  showMigrarADomicilioModal = signal<boolean>(false);
  barrios = signal<BarrioTarifa[]>([]);

  migrarForm: FormGroup = this._fb.group({
    cliente_nombre: ['', Validators.required],
    cliente_telefono: ['', Validators.required],
    cliente_direccion: ['', Validators.required],
    cliente_barrio: [''],
  });

  mesasResource = rxResource({
    loader: () => this._mesasService.getAll(),
  });

  mesaForm: FormGroup = this._fb.group({
    numero: ['', [Validators.required, Validators.min(1)]],
    capacidad: [4, [Validators.required, Validators.min(1)]],
    ubicacion: ['Salón'],
    estado: ['libre']
  });

  isSubmitting = signal(false);
  showForm = signal(false);

  // POS State
  showOrderModal = signal(false);
  isLoadingModal = signal(false);
  isLoadingOrderData = signal(false);
  selectedMesa = signal<Mesa | null>(null);
  activeOrderId = signal<string | number | null>(null);
  activeOrdersList = signal<any[]>([]);
  originalOrderItems = signal<any[]>([]);
  
  showHistoryModal = signal(false);
  orderHistory = signal<any[]>([]);
  historyFilterDate = signal<string>('');
  selectedHistoryOrder = signal<any | null>(null);

  // Transferencia / Cambio de Mesa State
  showCambiarMesaModal = signal<boolean>(false);
  targetMesaCambio = signal<Mesa | null>(null);

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

  mesasLibresParaCambio = computed(() => {
    const allMesas = this.mesasResource.value() || [];
    const current = this.selectedMesa();
    return allMesas.filter(m => m.estado === 'libre' && (!current || m.mesa_id !== current.mesa_id));
  });
  
  menuPlatos = signal<Plato[]>([]);
  todasLasCategorias = signal<Categoria[]>([]);
  categories = signal<string[]>(['Todos']);
  selectedCategory = signal<string>('Todos');
  searchTerm = signal<string>('');
  activeSeccion = signal<'Todos' | 'Parrilla' | 'Pizzas' | 'Bebidas'>('Todos');

  onWheelScroll(event: WheelEvent, el: HTMLElement): void {
    if (el && event.deltaY) {
      event.preventDefault();
      el.scrollLeft += event.deltaY;
    }
  }
  
  orderItems = signal<OrderItem[]>([]);
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

  isPizzaPlato(plato: Plato): boolean {
    if (!plato || !plato.categoria) return false;
    const cat = this.todasLasCategorias().find(c => c.nombre === plato.categoria);
    return cat?.seccion === 'Pizzas' || plato.categoria.toLowerCase().includes('pizza');
  }

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
    this.loadActiveOrders();

    // 1. Suscripción instantánea a eventos Server-Sent Events (SSE)
    this.realTimeSub = this._pedidosService.getEventsStream().subscribe({
      next: (event) => {
        console.log('[AdminMesas] Evento en tiempo real recibido:', event?.type);
        if (event?.type === 'platos_changed') {
          this.loadMenu(true);
        } else if (event?.type === 'impresion_fallida') {
          alert(`⚠️ ATENCIÓN: Falló la impresión en ${event.data?.tipo || ''} (${event.data?.destino || ''}). Error: ${event.data?.error || 'Revisa conexión o papel'}`);
        } else {
          this.silentSync();
        }
      },
      error: (err) => console.warn('[AdminMesas] SSE reconectando...', err)
    });

    // 2. Intervalo de respaldo silencioso cada 3 segundos
    this.syncInterval = setInterval(() => {
      this.silentSync();
    }, 3000);
  }

  ngOnDestroy() {
    if (this.realTimeSub) this.realTimeSub.unsubscribe();
    if (this.syncInterval) clearInterval(this.syncInterval);
  }

  silentSync() {
    this._pedidosService.getActive(true).subscribe({
      next: (pedidos) => {
        this.activeOrdersList.set(pedidos || []);
        this.mesasResource.reload();

        // Si el modal de una mesa está abierto, actualizar orden si no hay cambios sin guardar
        const curMesa = this.selectedMesa();
        if (curMesa && this.showOrderModal()) {
          const updatedOrder = (pedidos || []).find((p: any) =>
            this.isSameMesa(p.mesa, curMesa) &&
            p.estado !== 'Completado' &&
            p.estado !== 'Cancelado'
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
          }
        }

        // Si el modal de historial está abierto, refrescar historial
        if (this.showHistoryModal()) {
          this._pedidosService.getAll(true).subscribe({
            next: (all) => {
              const sorted = (all || []).sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
              this.orderHistory.set(sorted);
              this._cdr.detectChanges();
            }
          });
        }

        this._cdr.detectChanges();
      },
      error: (err) => console.error('Silent sync error in Admin:', err)
    });
  }

  loadActiveOrders(forceRefresh: boolean = false) {
    this._pedidosService.getActive(forceRefresh).subscribe({
      next: (pedidos) => {
        this.activeOrdersList.set(pedidos || []);
        this._cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar pedidos activos:', err)
    });
  }

  async loadMenu(forceRefresh: boolean = false) {
    try {
      const [platos, categoriasRes] = await Promise.all([
        firstValueFrom(this._platosService.getAll(forceRefresh)),
        firstValueFrom(this._categoriasService.getAll('menu'))
      ]);
      this.menuPlatos.set(platos || []);
      
      this.todasLasCategorias.set(categoriasRes.data || []);
      
      // Extract unique categories
      const uniqueCategories = new Set(
        (platos || [])
          .map(p => p.categoria)
          .filter((c): c is string => !!c)
      );
      this.categories.set(['Todos', ...Array.from(uniqueCategories)]);
    } catch (error) {
      console.error('Error loading menu:', error);
    }
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

  // Mixed Payment State
  pagosMixtosList = signal<{ metodo: string; monto: number }[]>([
    { metodo: 'Efectivo', monto: 0 },
    { metodo: 'Nequi', monto: 0 }
  ]);

  totalPagadoMixto = computed(() => {
    return this.pagosMixtosList().reduce((sum, item) => sum + (Number(item.monto) || 0), 0);
  });

  diferenciaMixto = computed(() => {
    return this.checkoutTotal() - this.totalPagadoMixto();
  });

  montoEfectivoMixto = computed(() => {
    if (this.checkoutMetodoPago() !== 'Pago Mixto') return 0;
    const sub = this.pagosMixtosList().find(p => String(p.metodo).toLowerCase().includes('efectivo'));
    return Number(sub?.monto) || 0;
  });

  vueltoMixto = computed(() => {
    if (this.checkoutMetodoPago() !== 'Pago Mixto') return 0;
    const entrega = Number(this.checkoutEntrega()) || 0;
    const efectivoReq = this.montoEfectivoMixto();
    return (entrega > efectivoReq && efectivoReq > 0) ? (entrega - efectivoReq) : 0;
  });

  addPagoMixtoFila() {
    const current = this.pagosMixtosList();
    const faltante = Math.max(0, this.diferenciaMixto());
    this.pagosMixtosList.set([...current, { metodo: 'Nequi', monto: faltante }]);
  }

  removePagoMixtoFila(index: number) {
    const current = this.pagosMixtosList();
    if (current.length <= 1) return;
    this.pagosMixtosList.set(current.filter((_, i) => i !== index));
  }

  updatePagoMixtoFila(index: number, field: 'metodo' | 'monto', val: any) {
    const current = [...this.pagosMixtosList()];
    if (field === 'monto') {
      current[index].monto = Math.max(0, Number(val) || 0);
    } else {
      current[index].metodo = val;
    }
    this.pagosMixtosList.set(current);
  }

  inicializarPagoMixto() {
    const total = this.checkoutTotal();
    const mitad = Math.floor(total / 2);
    this.pagosMixtosList.set([
      { metodo: 'Efectivo', monto: mitad },
      { metodo: 'Nequi', monto: total - mitad }
    ]);
  }

  selectCategory(category: string) {
    this.selectedCategory.set(category);
  }

  async crearBarraRapida() {
    const mesasActuales = this.mesasResource.value() || [];
    const maxNum = mesasActuales.reduce((max, m) => Math.max(max, Number(m.numero) || 0), 0);
    const nuevoNumero = maxNum + 1;

    const payload: CreateMesa = {
      numero: nuevoNumero,
      capacidad: 2,
      estado: 'libre',
      ubicacion: 'Barra'
    };

    try {
      await firstValueFrom(this._mesasService.create(payload));
      this.mesasResource.reload();
    } catch (error: any) {
      console.error(error);
      const msg = error?.error?.error || error?.error?.message || 'Error al crear la mesa de barra';
      alert(msg);
    }
  }

  async onSubmit() {
    if (this.mesaForm.invalid) return;
    
    this.isSubmitting.set(true);
    try {
      const data: CreateMesa = this.mesaForm.value;
      await firstValueFrom(this._mesasService.create(data));
      this.mesaForm.reset({ estado: 'libre', ubicacion: 'Salón', capacidad: 4 });
      this.showForm.set(false);
      this.mesasResource.reload();
    } catch (error: any) {
      console.error(error);
      const msg = error?.error?.error || 'Error al crear la mesa';
      alert(msg);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async onDelete(id: number) {
    if (!confirm('¿Seguro que deseas eliminar esta mesa?')) return;
    try {
      await firstValueFrom(this._mesasService.delete(id));
      this.mesasResource.reload();
    } catch (error: any) {
      console.error('Error al eliminar mesa:', error);
      const msg = error?.error?.error || error?.error?.message || error?.message || 'Error al eliminar la mesa';
      alert(msg);
    }
  }

  isSameMesa(pedidoMesa: any, mesa: Mesa): boolean {
    if (!pedidoMesa || !mesa) return false;
    const pStr = String(pedidoMesa).trim().toLowerCase();
    const mNum = String(mesa.numero).trim().toLowerCase();

    if (pStr === mNum) return true;

    if (mesa.ubicacion === 'Barra') {
      if (pStr === `barra ${mNum}` || pStr === `barra b${mNum}` || pStr === `b${mNum}`) {
        return true;
      }
    } else {
      if (pStr === `mesa ${mNum}`) {
        return true;
      }
    }

    const normP = pStr.replace(/^barra\s*/i, '').replace(/^mesa\s*/i, '').replace(/^b/i, '').trim();
    const normM = mNum.replace(/^barra\s*/i, '').replace(/^mesa\s*/i, '').replace(/^b/i, '').trim();

    return normP.length > 0 && normP === normM;
  }

  liberarMesaActual() {
    const mesa = this.selectedMesa();
    if (!mesa) return;
    const label = mesa.ubicacion === 'Barra' ? `la BARRA B${mesa.numero}` : `la Mesa ${mesa.numero}`;
    if (!confirm(`¿Deseas cambiar el estado de ${label} a libre?`)) return;

    this._mesasService.cambiarEstado(mesa.mesa_id, 'libre').subscribe({
      next: () => {
        this.mesasResource.reload();
        this.closeOrderModal();
      },
      error: (err: any) => {
        console.error('Error liberando mesa:', err);
        alert('Error al cambiar el estado de la mesa.');
      }
    });
  }

  openCambiarMesaModal() {
    this.targetMesaCambio.set(null);
    this.showCambiarMesaModal.set(true);
  }

  closeCambiarMesaModal() {
    this.showCambiarMesaModal.set(false);
    this.targetMesaCambio.set(null);
  }

  seleccionarMesaTarget(mesa: Mesa) {
    this.targetMesaCambio.set(mesa);
  }

  confirmarCambioDeMesa() {
    const currentMesa = this.selectedMesa();
    const targetMesa = this.targetMesaCambio();
    const orderId = this.activeOrderId();

    if (!currentMesa || !targetMesa || !orderId) return;

    const oldLabel = currentMesa.ubicacion === 'Barra' ? `Barra B${currentMesa.numero}` : `Mesa ${currentMesa.numero}`;
    const newLabel = targetMesa.ubicacion === 'Barra' ? `Barra B${targetMesa.numero}` : `Mesa ${targetMesa.numero}`;
    const newMesaName = targetMesa.ubicacion === 'Barra' ? `Barra B${targetMesa.numero}` : `${targetMesa.numero}`;

    if (!confirm(`¿Confirmas cambiar el pedido de ${oldLabel} a ${newLabel}?`)) return;

    const payload = {
      mesa: newMesaName,
      ubicacion: targetMesa.ubicacion || 'Salón'
    };

    this._pedidosService.update(String(orderId), payload).subscribe({
      next: () => {
        // 1. Liberar mesa anterior
        this._mesasService.cambiarEstado(currentMesa.mesa_id, 'libre').subscribe({
          next: () => {
            // 2. Ocupar nueva mesa
            this._mesasService.cambiarEstado(targetMesa.mesa_id, 'ocupada').subscribe({
              next: () => {
                this.mesasResource.reload();
                this.loadActiveOrders(true);
                this.closeCambiarMesaModal();
                this.closeOrderModal();
                alert(`✅ Pedido trasladado exitosamente de ${oldLabel} a ${newLabel}.`);
              }
            });
          }
        });
      },
      error: (err: any) => {
        console.error('Error trasladando pedido de mesa:', err);
        alert(err.error?.message || 'Error al cambiar el pedido de mesa');
      }
    });
  }

  loadBarrios() {
    this._barriosService.getAll().subscribe({
      next: (res: any) => this.barrios.set(res.data || res || []),
      error: (err: any) => console.error('Error cargando barrios:', err)
    });
  }

  openMigrarADomicilioModal() {
    this.migrarForm.reset();
    this.loadBarrios();
    this.showMigrarADomicilioModal.set(true);
  }

  closeMigrarADomicilioModal() {
    this.showMigrarADomicilioModal.set(false);
    this.migrarForm.reset();
  }

  private _searchTimeout: any;

  searchClientByPhone(event: Event) {
    const input = event.target as HTMLInputElement;
    const telefono = input.value.trim();

    if (this._searchTimeout) clearTimeout(this._searchTimeout);

    if (!telefono || telefono.length < 3) return;

    this._searchTimeout = setTimeout(() => {
      this._clientesService.getClientes().subscribe(clientes => {
        const cliente = clientes.find((c: any) => {
          if (!c.telefono) return false;
          const stored = c.telefono.replace(/\D/g, '');
          return stored === telefono || stored.endsWith(telefono) || telefono.endsWith(stored);
        });
        if (cliente) {
          this.migrarForm.patchValue({
            cliente_nombre: cliente.nombre,
            cliente_direccion: cliente.direccion,
            cliente_barrio: cliente.barrio || ''
          });
        }
      });
    }, 300);
  }

  confirmarMigracionADomicilio() {
    if (this.migrarForm.invalid) {
      alert('⚠️ Por favor completa los datos del cliente (Nombre, Teléfono y Dirección).');
      return;
    }

    const currentItems = this.orderItems();
    if (!currentItems || currentItems.length === 0) {
      alert('⚠️ Agrega al menos un platillo al pedido antes de migrar a Domicilio.');
      return;
    }

    const orderId = this.activeOrderId();
    const currentMesa = this.selectedMesa();
    const clientData = this.migrarForm.value;
    const mesaLabel = currentMesa ? (currentMesa.ubicacion === 'Barra' ? `Barra B${currentMesa.numero}` : `Mesa ${currentMesa.numero}`) : 'Mesa';

    if (!confirm(`¿Deseas migrar los platillos del pedido de ${mesaLabel} a Domicilio para ${clientData.cliente_nombre}?`)) {
      return;
    }

    const subtotal = currentItems.reduce((sum, item) => sum + item.precio * item.qty, 0);

    // Guardar/Crear cliente frecuente
    this._clientesService.createCliente({
      nombre: clientData.cliente_nombre,
      telefono: clientData.cliente_telefono,
      direccion: clientData.cliente_direccion,
      barrio: clientData.cliente_barrio || ''
    }).subscribe({
      next: () => {},
      error: (err: any) => console.error('Error guardando cliente frecuente:', err)
    });

    if (orderId) {
      // CASO 1: El pedido ya existía en BD backend
      const payload: any = {
        tipo: 'Domicilio',
        mesa: 'Domicilio',
        ubicacion: 'Domicilio',
        cliente_nombre: clientData.cliente_nombre,
        cliente_telefono: clientData.cliente_telefono,
        cliente_direccion: clientData.cliente_direccion,
        cliente_barrio: clientData.cliente_barrio || '',
        items: currentItems,
        subtotal: subtotal,
        total: subtotal
      };

      this._pedidosService.update(String(orderId), payload).subscribe({
        next: () => {
          if (currentMesa) {
            this._mesasService.cambiarEstado(currentMesa.mesa_id, 'libre').subscribe({
              next: () => {
                this.mesasResource.reload();
                this.loadActiveOrders(true);
                this.closeMigrarADomicilioModal();
                this.closeOrderModal();
                alert(`✅ Pedido migrado exitosamente a DOMICILIO. ${mesaLabel} ha sido liberada.`);
              },
              error: (err: any) => {
                console.error('Error liberando mesa:', err);
                alert('El pedido se migró a domicilio pero hubo un inconveniente al liberar la mesa.');
              }
            });
          } else {
            this.loadActiveOrders(true);
            this.closeMigrarADomicilioModal();
            this.closeOrderModal();
            alert(`✅ Pedido migrado exitosamente a DOMICILIO.`);
          }
        },
        error: (err: any) => {
          console.error('Error migrando pedido a domicilio:', err);
          alert(err.error?.message || 'Error al migrar el pedido a domicilio');
        }
      });
    } else {
      // CASO 2: El pedido NO existía aún en BD backend (se estaba armando en el carrito de la mesa)
      // Lo guardamos como Borrador en localStorage ('restausync_domicilios_borradores')
      const BORRADORES_KEY = 'restausync_domicilios_borradores';
      const draftId = `draft_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      const draftObj = {
        id: draftId,
        fechaCreacion: new Date().toISOString(),
        cliente: {
          cliente_nombre: clientData.cliente_nombre || '',
          cliente_telefono: clientData.cliente_telefono || '',
          cliente_direccion: clientData.cliente_direccion || '',
          cliente_barrio: clientData.cliente_barrio || '',
          domiciliario: ''
        },
        items: currentItems,
        subtotal: subtotal,
        total: subtotal
      };

      try {
        const raw = localStorage.getItem(BORRADORES_KEY);
        let list: any[] = [];
        if (raw) {
          list = JSON.parse(raw);
          if (!Array.isArray(list)) list = [];
        }
        list.unshift(draftObj);
        localStorage.setItem(BORRADORES_KEY, JSON.stringify(list));
      } catch (e) {
        console.error('Error guardando borrador de domicilio en localStorage:', e);
      }

      this.closeMigrarADomicilioModal();
      this.closeOrderModal();
      alert(`✅ Los platillos de ${mesaLabel} se migraron como borrador de DOMICILIO para ${clientData.cliente_nombre}. Puedes completar el pedido en el módulo de Domicilios.`);
    }
  }

  abrirPedidoRapidoDirecto() {
    this.selectedMesa.set(null);
    this.activeOrderId.set(null);
    this.orderItems.set([]);
    this.originalOrderItems.set([]);
    this.updateTotals();
    this.isQuickOrderMode.set(true);
    this.showOrderModal.set(true);
  }

  private getDraftKey(mesaId: number): string {
    return `restausync_admin_draft_mesa_${mesaId}`;
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
      console.error('Error limpiando borrador admin:', e);
    }
  }

  public saveDraftForCurrentMesa() {
    const mesa = this.selectedMesa();
    if (!mesa || this.isQuickOrderMode()) return;
    const items = this.orderItems();
    const orig = this.originalOrderItems();

    if (!items || items.length === 0) {
      this.clearDraftForMesa(mesa.mesa_id);
      return;
    }

    const isDirty = JSON.stringify(items) !== JSON.stringify(orig);
    if (!isDirty && this.activeOrderId()) {
      this.clearDraftForMesa(mesa.mesa_id);
      return;
    }

    try {
      const draft = {
        mesa_id: mesa.mesa_id,
        items,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(this.getDraftKey(mesa.mesa_id), JSON.stringify(draft));
    } catch (e) {
      console.error('Error guardando borrador:', e);
    }
  }

  descartarBorradorActual() {
    const mesa = this.selectedMesa();
    if (!mesa) return;
    this.clearDraftForMesa(mesa.mesa_id);
    const orig = this.originalOrderItems();
    this.orderItems.set(JSON.parse(JSON.stringify(orig)));
    this.updateTotals();
  }

  imprimirPrecuentaMesaActual() {
    const mesa = this.selectedMesa();
    const items = this.orderItems();
    if (!mesa) return;
    if (items.length === 0) {
      alert('Agrega al menos un platillo al pedido para imprimir la pre-cuenta.');
      return;
    }

    const activeOrder = (this.activeOrdersList() || []).find((p: any) => this.isSameMesa(p.mesa, mesa));
    const esBarra = mesa.ubicacion === 'Barra';
    const mesaNombre = esBarra ? `BARRA ${mesa.numero}` : mesa.numero.toString();
    const currentUser = this._authService.user();
    const currentUserName = currentUser ? `${currentUser.name} ${currentUser.surname || ''}`.trim() : 'Administrador';

    const pedidoInfo = {
      id: this.activeOrderId() || activeOrder?.id,
      orderNumber: activeOrder?.orderNumber,
      mesa: mesaNombre,
      ubicacion: mesa.ubicacion || 'Salón',
      tipo: esBarra ? 'Barra' : 'Mesa',
      subtotal: this.orderSubtotal(),
      total: this.orderTotal(),
      cliente_nombre: activeOrder?.cliente_nombre || (esBarra ? `Cliente BARRA ${mesa.numero}` : 'Cliente Mesa'),
      mesero: activeOrder?.mesero || currentUserName,
      items: items
    };

    this._mesasService.imprimirPrecuenta(pedidoInfo).subscribe({
      next: (res: any) => {
        alert(res?.message || `🧾 Pre-cuenta de ${mesaNombre} enviada a la impresora principal con éxito.`);
      },
      error: (err: any) => {
        console.error('Error al imprimir pre-cuenta:', err);
        alert(err?.error?.error || 'Error al enviar la pre-cuenta a la impresora principal.');
      }
    });
  }

  openOrderModal(mesa: Mesa) {
    this.isQuickOrderMode.set(false);
    this.selectedMesa.set(mesa);
    this.isLoadingOrderData.set(false);
    this.showOrderModal.set(true);

    // 1. Cargar orden en 0ms desde la memoria
    const activeOrder = (this.activeOrdersList() || []).find((pedido: any) =>
      this.isSameMesa(pedido.mesa, mesa) &&
      pedido.estado !== 'Completado' &&
      pedido.estado !== 'Cancelado'
    );
    const savedDraft = this.getDraftForMesa(mesa.mesa_id);

    if (activeOrder) {
      this.activeOrderId.set(activeOrder.id);
      const itemsCopy = JSON.parse(JSON.stringify(activeOrder.items || []));
      this.originalOrderItems.set(JSON.parse(JSON.stringify(itemsCopy)));

      if (savedDraft && Array.isArray(savedDraft.items) && savedDraft.items.length > itemsCopy.length) {
        this.orderItems.set(savedDraft.items);
      } else {
        this.orderItems.set(itemsCopy);
      }
    } else {
      this.activeOrderId.set(null);
      this.originalOrderItems.set([]);

      if (savedDraft && Array.isArray(savedDraft.items) && savedDraft.items.length > 0) {
        this.orderItems.set(savedDraft.items);
      } else {
        this.orderItems.set([]);
      }
    }

    this.updateTotals();

    // 2. Sincronización silenciosa en segundo plano sin bloqueos
    this._pedidosService.getActive().subscribe({
      next: (pedidos) => {
        this.activeOrdersList.set(pedidos || []);
        const currentMesa = this.selectedMesa();
        if (currentMesa && currentMesa.mesa_id === mesa.mesa_id) {
          const updatedOrder = (pedidos || []).find((p: any) =>
            this.isSameMesa(p.mesa, currentMesa) &&
            p.estado !== 'Completado' &&
            p.estado !== 'Cancelado'
          );

          // Solo actualizar los ítems si el usuario no tiene cambios sin guardar en el carrito
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
          } else if (this.activeOrderId() && !updatedOrder && !isDirty) {
            this.activeOrderId.set(null);
            this.orderItems.set([]);
            this.originalOrderItems.set([]);
            this.updateTotals();
          }
        }
      }
    });
  }

  closeOrderModal() {
    this.showOrderModal.set(false);
    this.selectedMesa.set(null);
    this.activeOrderId.set(null);
    this.originalOrderItems.set([]);
    this.isQuickOrderMode.set(false);
    this.isLoadingModal.set(false);
    this.isLoadingOrderData.set(false);
  }

  private calculateNewItems(original: any[], current: any[]): any[] {
    const newItems: any[] = [];
    for (const item of current) {
      const itemKey = `${item.id || item.nombre}_${item.notas || ''}_${item.tipoEntrega || 'mesa'}`;
      const origMatch = (original || []).find(o => `${o.id || o.nombre}_${o.notas || ''}_${o.tipoEntrega || 'mesa'}` === itemKey);
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
      next: (pedidos) => {
        const sorted = (pedidos || []).sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        this.orderHistory.set(sorted);
        this.showHistoryModal.set(true);
      },
      error: (err) => console.error('Error cargando historial de pedidos:', err)
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
        console.log(`[Historial Mesas] Método de pago actualizado para pedido #${pedido.orderNumber || pedido.id} a: ${nuevoMetodo}`);
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
        alert('Pedido actualizado correctamente en la base de datos.');
      },
      error: (err: any) => alert(err.error?.message || 'Error al actualizar el pedido')
    });
  }

  getOrderTitle(pedido: any): string {
    if (!pedido) return 'Pedido';
    const nombre = (pedido.cliente_nombre || '').trim();
    const mesa = (pedido.mesa || '').trim();
    
    if (nombre && (pedido.tipo === 'Domicilio' || !mesa || mesa.toLowerCase() === 'domicilio')) {
      return nombre;
    }
    
    if (!mesa) {
      if (nombre) return nombre;
      if (pedido.tipo) return pedido.tipo;
      return 'Pedido';
    }
    
    if (/^mesa/i.test(mesa)) {
      return mesa;
    }
    
    if (/^barra/i.test(mesa)) {
      return `Mesa ${mesa}`;
    }

    if (/^venta/i.test(mesa)) {
      return mesa;
    }

    return `Mesa ${mesa}`;
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
    if (event) event.stopPropagation();
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
        categoria: plato.categoria
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
        categoria: f1.categoria
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
    
    // Buscar la seccion a partir de la categoria del plato
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
        categoria: plato.categoria
      });
    }
    this.orderItems.set(items);
    this.updateTotals();
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

  updateItemOption(platoId: any, option: 'tipoEntrega' | 'notas', value: any) {
    const items = [...this.orderItems()];
    const targetId = String(platoId);
    const existing = items.find(i => String(i.id) === targetId);
    if (existing) {
      if (option === 'tipoEntrega') existing.tipoEntrega = value;
      if (option === 'notas') existing.notas = value;
      this.orderItems.set(items);
    }
  }

  // Feature 1: Métodos de Notas Rápidas para Cocina
  toggleNotesItem(itemId: any) {
    if (this.activeNotesItemId() === itemId) {
      this.activeNotesItemId.set(null);
    } else {
      this.activeNotesItemId.set(itemId);
    }
  }

  hasNota(itemId: any, nota: string): boolean {
    const item = this.orderItems().find(i => String(i.id) === String(itemId));
    if (!item || !item.notas) return false;
    return item.notas.toLowerCase().includes(nota.toLowerCase());
  }

  toggleNotaRapida(itemId: any, nota: string) {
    const items = [...this.orderItems()];
    const target = items.find(i => String(i.id) === String(itemId));
    if (!target) return;

    let partes = (target.notas || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const index = partes.findIndex(p => p.toLowerCase() === nota.toLowerCase());

    if (index >= 0) {
      partes.splice(index, 1);
    } else {
      partes.push(nota);
    }

    target.notas = partes.join(', ');
    this.orderItems.set(items);
  }

  clearNotas(itemId: any) {
    const items = [...this.orderItems()];
    const target = items.find(i => String(i.id) === String(itemId));
    if (target) {
      target.notas = '';
      this.orderItems.set(items);
    }
  }

  updateTotals() {
    const subtotal = this.orderItems().reduce((sum, item) => sum + item.precio * item.qty, 0);
    const tax = 0;
    this.orderSubtotal.set(subtotal);
    this.orderTax.set(tax);
    this.orderTotal.set(subtotal + tax);
    this.saveDraftForCurrentMesa();
  }

  registerOrder() {
    this.guardarYOcuparMesa();
  }

  isQuickOrderMode = signal(false);

  iniciarPedidoRapido() {
    const items = this.orderItems();
    if (items.length === 0) {
      alert('Agrega al menos un platillo al pedido.');
      return;
    }
    this.isQuickOrderMode.set(true);
    this.abrirCobroMesa();
  }

  abrirCobroMesa() {
    const items = this.orderItems();
    if (items.length === 0) {
      alert('Agrega al menos un platillo al pedido antes de proceder al cobro.');
      return;
    }
    this.showCheckoutModal.set(true);
    this.checkoutMetodoPago.set('Efectivo');
    this.checkoutImpuesto.set(0);
    this.checkoutPropinaTipo.set('Sin propina');
    this.checkoutPropinaPersonalizada.set(0);
    this.checkoutEntrega.set(0);
  }

  pagarPedido() {
    this.abrirCobroMesa();
  }

  guardarYOcuparMesa(skipPrint: boolean = false) {
    const mesa = this.selectedMesa();
    const items = this.orderItems();
    if (!mesa) return;
    if (items.length === 0) {
      alert('Agrega al menos un platillo al pedido.');
      return;
    }

    const currentId = this.activeOrderId();
    const esBarra = mesa.ubicacion === 'Barra';
    const mesaNombre = esBarra ? `BARRA ${mesa.numero}` : mesa.numero.toString();

    const formattedItems = items.map((i: any) => ({
      id: String(i.id),
      nombre: i.nombre,
      precio: i.precio,
      qty: i.qty,
      seccion: i.seccion || i.categoria || '',
      categoria: i.categoria || i.seccion || '',
      tipoEntrega: i.tipoEntrega || 'mesa',
      notas: i.notas || ''
    }));

    const currentUser = this._authService.user();
    const currentUserName = currentUser ? `${currentUser.name} ${currentUser.surname || ''}`.trim() : 'Administrador';
    const currentUserId = currentUser?.id;

    const payload: any = {
      tipo: esBarra ? 'Barra' : 'Mesa',
      mesa: mesaNombre,
      ubicacion: mesa.ubicacion || 'Salón',
      cliente_nombre: esBarra ? `Cliente BARRA ${mesa.numero}` : 'Cliente Mesa',
      estado: 'Recibido',
      mesero: currentUserName,
      usuario_id: currentUserId,
      subtotal: this.checkoutSubtotal(),
      impuesto_valor: 0,
      propina_valor: 0,
      total: this.checkoutTotal(),
      items: formattedItems
    };

    if (currentId) {
      const newItems = this.calculateNewItems(this.originalOrderItems(), formattedItems);
      this._pedidosService.update(currentId, payload).subscribe({
        next: (order: any) => {
          this.onOrderSavedYOcupar(mesa, order, formattedItems, newItems, mesaNombre, esBarra, true, skipPrint);
        },
        error: (err: any) => alert(err.error?.message || 'Error al actualizar el pedido')
      });
    } else {
      this._pedidosService.createPedido(payload).subscribe({
        next: (created: any) => {
          this.activeOrderId.set(created.id);
          this.onOrderSavedYOcupar(mesa, created, formattedItems, formattedItems, mesaNombre, esBarra, false, skipPrint);
        },
        error: (err: any) => alert(err.error?.message || 'Error al registrar pedido y ocupar mesa')
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
    skipPrint: boolean = false
  ) {
    this.loadActiveOrders(true);

    const currentUser = this._authService.user();
    const currentUserName = currentUser ? `${currentUser.name} ${currentUser.surname || ''}`.trim() : 'Administrador';

    const pedidoInfo = {
      id: order.id,
      orderNumber: order.orderNumber,
      mesa: mesaNombre,
      ubicacion: mesa.ubicacion || 'Salón',
      tipo: esBarra ? 'Barra' : 'Mesa',
      esAdicion: isUpdate,
      mesero: order.mesero || currentUserName
    };

    if (!skipPrint && newItemsToPrint && newItemsToPrint.length > 0) {
      this._mesasService.confirmarPedido(pedidoInfo, newItemsToPrint).subscribe({
        next: (res: any) => console.log('Comanda enviada a impresión:', res),
        error: (err: any) => console.error('Error al imprimir comanda:', err)
      });
    } else if (skipPrint) {
      console.log('Impresión omitida a petición del usuario.');
    } else {
      console.log('No hay productos nuevos para imprimir comanda a cocina.');
    }

    if (mesa) {
      this.clearDraftForMesa(mesa.mesa_id);
    }

    if (mesa.estado !== 'ocupada') {
      this._mesasService.cambiarEstado(mesa.mesa_id, 'ocupada').subscribe({
        next: () => {
          this.mesasResource.reload();
          this.closeOrderModal();
          const printStatusMsg = skipPrint ? '(sin enviar a impresoras)' : 'enviado a cocina';
          alert(`✅ Pedido guardado ${printStatusMsg}. ${esBarra ? 'La barra' : 'La mesa'} M${mesa.numero} ahora está OCUPADA.`);
        },
        error: (err: any) => {
          console.error(err);
          this.closeOrderModal();
        }
      });
    } else {
      this.closeOrderModal();
      let msg = '';
      if (skipPrint) {
        msg = `✅ Pedido de ${esBarra ? 'la barra' : 'la mesa'} M${mesa.numero} guardado sin enviar a impresoras.`;
      } else {
        msg = newItemsToPrint.length > 0
          ? `✅ Adición guardada. Pedido de ${esBarra ? 'la barra' : 'la mesa'} M${mesa.numero} actualizado y comanda de adición (${newItemsToPrint.length} ítems) enviada a cocina.`
          : `✅ Pedido de ${esBarra ? 'la barra' : 'la mesa'} M${mesa.numero} actualizado.`;
      }
      alert(msg);
    }
  }

  setPaymentMethod(method: string) {
    this.checkoutMetodoPago.set(method);
    if (method === 'Pago Mixto') {
      this.inicializarPagoMixto();
    } else if (method !== 'Efectivo') {
      this.checkoutEntrega.set(0);
    }
  }

  setTip(tipo: string) {
    this.checkoutPropinaTipo.set(tipo);
    if (tipo !== 'Personalizada') {
      this.checkoutPropinaPersonalizada.set(0);
    }
  }

  confirmarCobro(imprimir: boolean) {
    const mesa = this.selectedMesa();
    const items = this.orderItems();
    if (items.length === 0) {
      alert('Agrega al menos un platillo al pedido.');
      return;
    }

    const esMixto = this.checkoutMetodoPago() === 'Pago Mixto';
    let validPagosMixtos: { metodo: string; monto: number }[] = [];

    if (esMixto) {
      if (Math.abs(this.diferenciaMixto()) > 1) {
        if (this.diferenciaMixto() > 1) {
          alert(`El desglose de Pago Mixto ($${this.totalPagadoMixto().toLocaleString()}) no cubre el total de la orden ($${this.checkoutTotal().toLocaleString()}). Falta: $${this.diferenciaMixto().toLocaleString()}`);
        } else {
          alert(`El desglose de Pago Mixto sobrepasa el total de la orden por $${(-this.diferenciaMixto()).toLocaleString()}. Ajusta los montos.`);
        }
        return;
      }
      validPagosMixtos = this.pagosMixtosList().filter(p => Number(p.monto) > 0);
    }

    const entregado = esMixto ? (this.montoEfectivoMixto() > 0 ? (Number(this.checkoutEntrega()) || 0) : 0) : (this.checkoutMetodoPago() === 'Efectivo' ? (Number(this.checkoutEntrega()) || 0) : 0);
    const cambio = esMixto ? this.vueltoMixto() : Number(this.checkoutVuelto()) || 0;

    const currentUser = this._authService.user();
    const currentUserName = currentUser ? `${currentUser.name} ${currentUser.surname || ''}`.trim() : 'Administrador';
    const currentUserId = currentUser?.id;

    if (this.isQuickOrderMode()) {
      const payload: any = {
        tipo: 'Llevar',
        mesa: mesa ? (mesa.ubicacion === 'Barra' ? `BARRA ${mesa.numero}` : mesa.numero.toString()) : 'Venta Rápida',
        ubicacion: 'Mostrador',
        cliente_nombre: 'Cliente Venta Rápida',
        estado: 'Completado',
        mesero: currentUserName,
        usuario_id: currentUserId,
        metodo_pago: this.checkoutMetodoPago(),
        monto_entregado: entregado,
        vuelto: cambio,
        subtotal: this.checkoutSubtotal(),
        impuesto_valor: this.checkoutImpuestoMonto(),
        propina_valor: this.checkoutPropinaMonto(),
        total: this.checkoutTotal(),
        items: items.map((i: any) => ({
          id: String(i.id),
          nombre: i.nombre,
          precio: i.precio,
          qty: i.qty,
          tipoEntrega: 'llevar',
          notas: i.notas || ''
        }))
      };
      if (esMixto) {
        payload.pagos_mixtos = validPagosMixtos;
      }

      this._pedidosService.createPedido(payload).subscribe({
        next: (created: any) => {
          this.loadActiveOrders(true);
          const tieneEfectivo = this.checkoutMetodoPago() === 'Efectivo' || (esMixto && this.montoEfectivoMixto() > 0);
          if (tieneEfectivo) {
            this._mesasService.abrirCaja().subscribe({
              next: (res: any) => console.log('Caja abierta:', res),
              error: (err: any) => console.error('Error al abrir caja:', err)
            });
          }
          if (imprimir) {
            this._mesasService.imprimirFactura(created).subscribe({
              next: () => console.log('Factura de venta rápida impresa'),
              error: (err: any) => console.error('Error al imprimir factura:', err)
            });
          }
          this.isQuickOrderMode.set(false);
          this.showCheckoutModal.set(false);
          this.closeOrderModal();
          alert(`Venta rápida registrada exitosamente con ${this.checkoutMetodoPago()} ($${this.checkoutTotal().toLocaleString()}).`);
        },
        error: (err: any) => alert(err.error?.message || 'Error al registrar venta rápida')
      });
      return;
    }

    if (!mesa) return;

    const currentId = this.activeOrderId();
    const esBarra = mesa.ubicacion === 'Barra';
    const mesaNombre = esBarra ? `BARRA ${mesa.numero}` : mesa.numero.toString();

    // Preservar mesero original si ya existía en la orden activa (ej. Juan Pérez)
    const existingActiveOrder = (this.activeOrdersList() || []).find((p: any) => this.isSameMesa(p.mesa, mesa));
    const finalMesero = existingActiveOrder?.mesero || currentUserName;
    const finalUserId = existingActiveOrder?.usuario_id || currentUserId;

    const formattedItems = items.map((i: any) => ({
      id: String(i.id),
      nombre: i.nombre,
      precio: i.precio,
      qty: i.qty,
      seccion: i.seccion || i.categoria || '',
      categoria: i.categoria || i.seccion || '',
      tipoEntrega: i.tipoEntrega || 'mesa',
      notas: i.notas || ''
    }));

    const payload: any = {
      tipo: esBarra ? 'Barra' : 'Mesa',
      mesa: mesaNombre,
      ubicacion: mesa.ubicacion || 'Salón',
      cliente_nombre: esBarra ? `Cliente BARRA ${mesa.numero}` : 'Cliente Mesa',
      estado: 'Completado',
      mesero: finalMesero,
      usuario_id: finalUserId,
      metodo_pago: this.checkoutMetodoPago(),
      monto_entregado: entregado,
      vuelto: cambio,
      subtotal: this.checkoutSubtotal(),
      impuesto_valor: this.checkoutImpuestoMonto(),
      propina_valor: this.checkoutPropinaMonto(),
      total: this.checkoutTotal(),
      items: formattedItems
    };
    if (esMixto) {
      payload.pagos_mixtos = validPagosMixtos;
    }

    if (currentId) {
      const newItems = this.calculateNewItems(this.originalOrderItems(), formattedItems);
      this._pedidosService.update(currentId, payload).subscribe({
        next: (order: any) => {
          this.onPagoExitosoYLiberar(mesa, order, formattedItems, newItems, mesaNombre, esBarra, imprimir, true);
        },
        error: (err: any) => alert(err.error?.message || 'Error al registrar el pago')
      });
    } else {
      this._pedidosService.createPedido(payload).subscribe({
        next: (created: any) => {
          this.activeOrderId.set(created.id);
          this.onPagoExitosoYLiberar(mesa, created, formattedItems, formattedItems, mesaNombre, esBarra, imprimir, false);
        },
        error: (err: any) => alert(err.error?.message || 'Error al registrar pago y crear pedido')
      });
    }
  }

  private onPagoExitosoYLiberar(
    mesa: Mesa,
    order: any,
    allItems: any[],
    newItemsToPrint: any[],
    mesaNombre: string,
    esBarra: boolean,
    imprimir: boolean,
    isUpdate: boolean
  ) {
    this.loadActiveOrders(true);

    const tieneEfectivo = this.checkoutMetodoPago() === 'Efectivo' || (this.checkoutMetodoPago() === 'Pago Mixto' && this.montoEfectivoMixto() > 0);
    if (tieneEfectivo) {
      this._mesasService.abrirCaja().subscribe({
        next: (res: any) => console.log('Caja abierta por pago en efectivo:', res),
        error: (err: any) => console.error('Error al abrir caja registradora:', err)
      });
    }

    if (newItemsToPrint && newItemsToPrint.length > 0) {
      const pedidoInfo = {
        id: order.id,
        orderNumber: order.orderNumber,
        mesa: mesaNombre,
        ubicacion: mesa.ubicacion || 'Salón',
        tipo: esBarra ? 'Barra' : 'Mesa',
        esAdicion: isUpdate
      };
      this._mesasService.confirmarPedido(pedidoInfo, newItemsToPrint).subscribe({
        next: (res: any) => console.log('Comanda de adición enviada a impresión:', res),
        error: (err: any) => console.error('Error al imprimir comanda:', err)
      });
    }

    if (imprimir) {
      this._mesasService.imprimirFactura(order).subscribe({
        next: () => console.log('Factura enviada a impresión'),
        error: (err: any) => console.error('Error al imprimir factura', err)
      });
    }

    this.clearDraftForMesa(mesa.mesa_id);

    this._mesasService.cambiarEstado(mesa.mesa_id, 'libre').subscribe({
      next: () => {
        this.mesasResource.reload();
        this.showCheckoutModal.set(false);
        this.closeOrderModal();
        alert(`✅ Pago registrado exitosamente (${this.checkoutMetodoPago()} - $${this.checkoutTotal().toLocaleString()}). ${esBarra ? 'La barra' : 'La mesa'} M${mesa.numero} ahora está LIBRE.`);
      },
      error: (err: any) => {
        console.error(err);
        this.showCheckoutModal.set(false);
        this.closeOrderModal();
        alert('Pago registrado, pero ocurrió un error al liberar la mesa.');
      }
    });
  }

  finalizarYLiberarMesa() {
    this.abrirCobroMesa();
  }

  cancelCheckout() {
    this.isQuickOrderMode.set(false);
    this.showCheckoutModal.set(false);
  }

  shortId(id: any): string {
    if (!id) return '';
    const str = String(id);
    return str.length > 8 ? str.slice(0, 8) : str;
  }

  imprimirTicketFactura(order: any) {
    if (!order) return;
    const pedidoInfo = {
      id: order.id,
      tipo: order.tipo || 'Mesa',
      mesa: order.mesa || 'Barra',
      cliente_nombre: order.cliente_nombre || order.cliente || 'Cliente Mesa',
      cliente_telefono: order.cliente_telefono || '',
      cliente_direccion: order.cliente_direccion || '',
      cliente_barrio: order.cliente_barrio || '',
      domiciliario: order.domiciliario || '',
      metodo_pago: order.metodo_pago || 'Efectivo',
      pagos_mixtos: order.pagos_mixtos || null,
      monto_entregado: order.monto_entregado || 0,
      vuelto: order.vuelto || 0,
      subtotal: order.subtotal || 0,
      impuesto_porcentaje: order.impuesto_porcentaje || 0,
      impuesto_valor: order.impuesto_valor || 0,
      propina_valor: order.propina_valor || 0,
      total: order.total || 0,
      items: order.items || [],
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

  reimprimirTicketMesaDesdeMapa(mesa: Mesa, event?: Event) {
    if (event) event.stopPropagation();
    const activeOrder = (this.activeOrdersList() || []).find((pedido: any) =>
      this.isSameMesa(pedido.mesa, mesa) &&
      pedido.estado !== 'Completado' &&
      pedido.estado !== 'Cancelado'
    );
    if (activeOrder) {
      this.imprimirTicketFactura(activeOrder);
    } else {
      this._pedidosService.getActive().subscribe({
        next: (pedidos) => {
          this.activeOrdersList.set(pedidos || []);
          const found = (pedidos || []).find((p: any) =>
            this.isSameMesa(p.mesa, mesa) &&
            p.estado !== 'Completado' &&
            p.estado !== 'Cancelado'
          );
          if (found) {
            this.imprimirTicketFactura(found);
          } else {
            alert('No se encontró un pedido activo en esta mesa para reimprimir ticket.');
          }
        },
        error: (err) => alert('Error al consultar los pedidos activos de las mesas.')
      });
    }
  }

  reimprimirTicketMesaActual() {
    const mesa = this.selectedMesa();
    if (!mesa) return;
    const activeOrder = (this.activeOrdersList() || []).find((pedido: any) =>
      this.isSameMesa(pedido.mesa, mesa) &&
      pedido.estado !== 'Completado' &&
      pedido.estado !== 'Cancelado'
    );
    if (activeOrder) {
      this.imprimirTicketFactura(activeOrder);
    } else if (this.activeOrderId()) {
      const orderId = this.activeOrderId();
      this.imprimirTicketFactura({
        id: orderId,
        mesa: mesa.numero,
        tipo: mesa.ubicacion === 'Barra' ? 'Barra' : 'Mesa',
        items: this.orderItems(),
        subtotal: this.orderSubtotal(),
        total: this.orderTotal()
      });
    } else {
      alert('No hay un pedido activo registrado para esta mesa.');
    }
  }

  abrirCajaDirecta() {
    this._mesasService.abrirCaja().subscribe({
      next: (res: any) => console.log('[Mesas] Pulso de apertura enviado al cajón monedero:', res),
      error: (err: any) => alert('Error al abrir la caja registradora: ' + (err.error?.message || err.message))
    });
  }
}

export default AdminMesasPageComponent;
