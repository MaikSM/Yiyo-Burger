import { InventarioService } from '@admin/services/inventario.service';
import { IngredientesService, Ingrediente, EstadisticasInventario } from '@admin/services/ingredientes.service';
import { PlatosService, Plato } from '@admin/services/platos.service';
import { CategoriasService, Categoria } from '@admin/services/categorias.service';
import { ProveedoresService, Proveedor, OrdenCompra, FacturaProveedor } from '@admin/services/proveedores.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { BehaviorSubject, map } from 'rxjs';
import {
  IsEmptyComponent,
  IsErrorComponent,
  IsLoadingComponent,
} from '@shared/components';
import { Capacitor } from '@capacitor/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'admin-inventario-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IsEmptyComponent,
    IsErrorComponent,
    IsLoadingComponent
  ],
  templateUrl: './admin-inventario-page.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminInventarioPageComponent implements OnInit {
  private _inventarioService: InventarioService = inject(InventarioService);
  private _ingredientesService: IngredientesService = inject(IngredientesService);
  private _platosService: PlatosService = inject(PlatosService);
  private _categoriasService: CategoriasService = inject(CategoriasService);
  private _proveedoresService: ProveedoresService = inject(ProveedoresService);
  private _cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private _activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  private reloadTrigger$ = new BehaviorSubject(0);
  private categoriasReloadTrigger$ = new BehaviorSubject(0);

  activeTab = signal<'menu' | 'inventario'>('menu');
  activeSeccion = signal<'Todos' | 'Parrilla' | 'Pizzas' | 'Bebidas'>('Todos');
  searchTerm = signal('');

  onWheelScroll(event: WheelEvent, el: HTMLElement): void {
    if (el && event.deltaY) {
      event.preventDefault();
      el.scrollLeft += event.deltaY;
    }
  }
  selectedCategoria = signal<string | null>(null);
  showAddCategoriaModal = signal(false);
  showDeleteCategoriaModal = signal(false);
  showAddPlatoModal = signal(false);
  showEditPlatoModal = signal(false);
  editingPlatoId = signal<number | null>(null);
  newCategoriaName = signal('');
  categoriaToDelete = signal('');
  categoriaTipo = signal<'menu' | 'inventario'>('menu');
  isQuickEditMode = signal(false);

  // Campos para platos
  nombre = signal('');
  descripcion = signal('');
  precio = signal(0);
  categoria = signal('');
  disponible = signal(true);
  tiempo_preparacion_minutos = signal(0);
  imagen_url = signal('');
  es_especial = signal(false);

  alergenos = signal([] as string[]);

  // Precios por tamaño
  precioPersonal = signal<number>(0);
  precioMediana = signal<number>(0);
  precioGrande = signal<number>(0);
  precioExtragrande = signal<number>(0);
  precioGigante = signal<number>(0);
  precioFamiliar = signal<number>(0);

  // Campos para ingredientes
  showAddIngredienteModal = signal(false);
  showEditIngredienteModal = signal(false);
  editingIngredienteId = signal<number | null>(null);
  ingredienteNombre = signal('');
  ingredienteCategoria = signal('');
  ingredienteUnidadMedida = signal('');
  ingredienteStockActual = signal(0);
  ingredienteStockMinimo = signal(0);
  ingredienteStockMaximo = signal(0);
  ingredienteCostoUnitario = signal(0);
  ingredienteDescripcion = signal('');
  ingredienteActivo = signal(true);
  ingredienteEstado = signal('');

  // ===== PROVEEDORES STATE =====
  proveedoresSubTab = signal<'directorio' | 'pedidos' | 'facturas'>('directorio');
  proveedores = signal<Proveedor[]>([]);
  ordenesCompra = signal<OrdenCompra[]>([]);
  facturas = signal<FacturaProveedor[]>([]);
  proveedoresSearch = signal('');
  facturasSearch = signal('');

  // Modal proveedores
  showProveedorModal = signal(false);
  editingProveedorId = signal<number | null>(null);
  provRazonSocial = signal('');
  provNit = signal('');
  provContacto = signal('');
  provTelefono = signal('');
  provCorreo = signal('');
  provDireccion = signal('');
  provCategoria = signal('');
  provBanco = signal('');
  provTipoCuenta = signal('');
  provNumeroCuenta = signal('');
  provDiasPlazo = signal(0);

  // Modal orden de compra
  showOrdenCompraModal = signal(false);
  ocProveedorId = signal(0);
  ocFechaEntrega = signal('');
  ocFotoFactura = signal<string>('');
  ocItems = signal<Array<{ ingrediente_id: number; nombre: string; cantidad_compra: number; unidad_compra: string; costo_compra: number; factor_conversion: number; unidad_stock: string; }>>([] as any[]);

  // Modal detalle de orden de compra y factura
  showOrdenDetailModal = signal(false);
  selectedOrdenDetail = signal<OrdenCompra | null>(null);
  selectedOrdenFactura = signal<FacturaProveedor | null>(null);

  // Modal recepción
  showRecepcionModal = signal(false);
  recepcionOrdenId = signal(0);
  recepcionOrden = signal<OrdenCompra | null>(null);
  recepcionFotoFactura = signal<string>('');
  recepcionItems = signal<Array<{ ingrediente_id: number; nombre: string; cantidad_solicitada: number; cantidad_recibida: number; merma: number; costo_real: number; checked: boolean; }>>([] as any[]);
  recepcionNumFactura = signal('');
  recepcionFechaEmision = signal('');

  // Modal pago
  showPagoModal = signal(false);
  pagoFacturaId = signal(0);
  pagoFacturaSaldo = signal(0);
  pagoMonto = signal(0);
  pagoMetodo = signal<'Efectivo' | 'Transferencia' | 'Caja Menor'>('Efectivo');

  proveedoresCategorias = ['Carnes', 'Salsas', 'Bebidas', 'Lácteos', 'Panadería', 'Verduras', 'Empaques', 'Limpieza', 'Otros'];

  inventarioResource = rxResource({
    request: () => this.reloadTrigger$.value,
    loader: () => this._inventarioService.getAll(),
  });

  platosResource = rxResource({
    request: () => this.reloadTrigger$.value,
    loader: () => this._platosService.getAll(),
  });

  ingredientesResource = rxResource({
    request: () => this.reloadTrigger$.value,
    loader: () => this._ingredientesService.getAll(),
  });



  categoriasResource = rxResource({
    request: () => this.categoriasReloadTrigger$.value,
    loader: () => this._categoriasService.getAll('menu').pipe(
      map(response => response.data)
    ),
  });

  categoriasInventarioResource = rxResource({
    request: () => this.categoriasReloadTrigger$.value,
    loader: () => {
      console.log('Cargando categorías de inventario...');
      return this._categoriasService.getAll('inventario').pipe(
        map(response => {
          console.log('Respuesta de categorías de inventario:', response);
          return response.data;
        })
      );
    },
  });

  categoriasMenuResource = rxResource({
    request: () => this.reloadTrigger$.value,
    loader: () => this._categoriasService.getAll('menu').pipe(
      map(response => response.data)
    ),
  });

  ngOnInit() {
    this._activatedRoute.url.subscribe(() => {
      const url = window.location.pathname;
      if (url.includes('/admin/menu')) {
        this.activeTab.set('menu');
      } else if (url.includes('/admin/inventario')) {
        this.activeTab.set('inventario');
        this.loadAllProveedoresData();
      }
      this._cdr.detectChanges();
    });

    this._inventarioService.reload$.subscribe(() => {
      this.reloadTrigger$.next(this.reloadTrigger$.value + 1);
    });

    this._ingredientesService.reload$.subscribe(() => {
      this.reloadTrigger$.next(this.reloadTrigger$.value + 1);
    });

    this._categoriasService.reload$.subscribe(() => {
      console.log('Recargando categorías...');
      this.categoriasReloadTrigger$.next(this.categoriasReloadTrigger$.value + 1);
      this._cdr.detectChanges();
    });

    // Inicializar filteredIngredientes cuando se cargan los datos
    // Usar un approach más simple: inicializar en el template
    // Los datos se filtran automáticamente cuando cambian
  }

  setActiveTab(tab: 'menu' | 'inventario') {
    this.activeTab.set(tab);
    this.selectedCategoria.set(null); // Reset category filter when switching tabs

    // Forzar recarga de categorías cuando cambiamos de pestaña
    this.categoriasReloadTrigger$.next(this.categoriasReloadTrigger$.value + 1);
    this._cdr.detectChanges();
  }

  selectCategoria(categoria: string | null) {
    this.selectedCategoria.set(categoria);
  }

  openAddCategoriaModal(tipo?: 'menu' | 'inventario') {
    console.log('Abriendo modal de agregar categoría');
    this.showAddCategoriaModal.set(true);
    this.newCategoriaName.set('');
    // Si no se especifica tipo, usar el de la pestaña activa
    this.categoriaTipo.set(tipo || (this.activeTab() === 'menu' ? 'menu' : 'inventario'));
    this._cdr.detectChanges();
  }

  closeAddCategoriaModal() {
    this.showAddCategoriaModal.set(false);
    this.newCategoriaName.set('');
  }

  openDeleteCategoriaModal() {
    console.log('Abriendo modal de eliminar categoría desde pestaña:', this.activeTab());
    this.showDeleteCategoriaModal.set(true);
    this.categoriaToDelete.set('');
    // Forzar recarga de categorías para asegurar que estén disponibles
    this.categoriasReloadTrigger$.next(this.categoriasReloadTrigger$.value + 1);
    // Forzar detección de cambios inmediatamente
    this._cdr.detectChanges();
    console.log('Modal abierto, showDeleteCategoriaModal:', this.showDeleteCategoriaModal());
  }



  closeDeleteCategoriaModal() {
    this.showDeleteCategoriaModal.set(false);
    this.categoriaToDelete.set('');
  }

  openAddPlatoModal() {
    this.showAddPlatoModal.set(true);
    this.nombre.set('');
    this.descripcion.set('');
    this.precio.set(0);
    this.categoria.set('');
    this.disponible.set(true);
    this.tiempo_preparacion_minutos.set(0);
    this.imagen_url.set('');
    this.es_especial.set(false);
    this.alergenos.set([]);
    this.precioPersonal.set(0);
    this.precioMediana.set(0);
    this.precioGrande.set(0);
    this.precioExtragrande.set(0);
    this.precioGigante.set(0);
    this.precioFamiliar.set(0);
  }

  closeAddPlatoModal() {
    this.showAddPlatoModal.set(false);
    this.showEditPlatoModal.set(false);
    this.editingPlatoId.set(null);
    this.nombre.set('');
    this.descripcion.set('');
    this.precio.set(0);
    this.categoria.set('');
    this.disponible.set(true);
    this.tiempo_preparacion_minutos.set(0);
    this.imagen_url.set('');
    this.es_especial.set(false);
    this.alergenos.set([]);
    this.precioPersonal.set(0);
    this.precioMediana.set(0);
    this.precioGrande.set(0);
    this.precioExtragrande.set(0);
    this.precioGigante.set(0);
    this.precioFamiliar.set(0);
  }

  openAddIngredienteModal() {
    this.showAddIngredienteModal.set(true);
    this.ingredienteNombre.set('');
    this.ingredienteCategoria.set('');
    this.ingredienteUnidadMedida.set('');
    this.ingredienteStockActual.set(0);
    this.ingredienteStockMinimo.set(0);
    this.ingredienteStockMaximo.set(0);
    this.ingredienteCostoUnitario.set(0);
    this.ingredienteDescripcion.set('');
    this.ingredienteActivo.set(true);
    this.ingredienteEstado.set('');
  }

  closeAddIngredienteModal() {
    this.showAddIngredienteModal.set(false);
    this.showEditIngredienteModal.set(false);
    this.editingIngredienteId.set(null);
    this.ingredienteNombre.set('');
    this.ingredienteCategoria.set('');
    this.ingredienteUnidadMedida.set('');
    this.ingredienteStockActual.set(0);
    this.ingredienteStockMinimo.set(0);
    this.ingredienteStockMaximo.set(0);
    this.ingredienteCostoUnitario.set(0);
    this.ingredienteDescripcion.set('');
    this.ingredienteActivo.set(true);
    this.ingredienteEstado.set('');
  }

  updatePrecioSize(size: string, event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    switch(size) {
      case 'Personal': this.precioPersonal.set(value); break;
      case 'Mediana': this.precioMediana.set(value); break;
      case 'Grande': this.precioGrande.set(value); break;
      case 'Extragrande': this.precioExtragrande.set(value); break;
      case 'Gigante': this.precioGigante.set(value); break;
      case 'Familiar': this.precioFamiliar.set(value); break;
    }
  }

  isPizzaCategory(): boolean {
    const cat = this.categoria();
    return cat === 'Pizzas' || (cat && cat.toLowerCase().includes('pizza')) || this.activeSeccion() === 'Pizzas';
  }

  createPlato() {
    const nombre = this.nombre();
    let precio = this.precio();
    const isPizza = this.isPizzaCategory();
    if (isPizza) {
      precio = this.precioMediana() || this.precioPersonal() || this.precioGrande() || this.precioExtragrande() || this.precioGigante() || this.precioFamiliar() || 1;
      this.precio.set(precio);
    }
    if (nombre.trim() && precio > 0) {
      // Preparar los datos del plato
      const platoToSend: any = {
        nombre: nombre.trim(),
        precio: precio,
        disponible: this.disponible(),
        es_especial: this.es_especial(),

      };

      // Agregar campos opcionales solo si tienen valores válidos
      const descripcion = this.descripcion();
      if (descripcion?.trim()) {
        platoToSend.descripcion = descripcion.trim();
      }

      const categoria = this.categoria();
      if (categoria && categoria.trim()) {
        platoToSend.categoria = categoria.trim();
      }

      const tiempo = this.tiempo_preparacion_minutos();
      if (tiempo && tiempo > 0) {
        platoToSend.tiempo_preparacion_minutos = tiempo;
      }


      const alergenos = this.alergenos();
      if (alergenos && alergenos.length > 0) {
        platoToSend.alergenos = alergenos;
      }

      const imagenUrl = this.imagen_url();
      if (imagenUrl && imagenUrl.trim()) {
        platoToSend.imagen_url = imagenUrl.trim();
      }

      // Precios por tamaño (Pizzas)
      const pxt: Record<string, number> = {};
      if (this.precioPersonal() > 0) pxt['Personal'] = this.precioPersonal();
      if (this.precioMediana() > 0) pxt['Mediana'] = this.precioMediana();
      if (this.precioGrande() > 0) pxt['Grande'] = this.precioGrande();
      if (this.precioExtragrande() > 0) pxt['Extragrande'] = this.precioExtragrande();
      if (this.precioGigante() > 0) pxt['Gigante'] = this.precioGigante();
      if (this.precioFamiliar() > 0) pxt['Familiar'] = this.precioFamiliar();

      if (Object.keys(pxt).length > 0) {
        platoToSend.precios_por_tamano = pxt;
      }

      console.log('Datos a enviar:', platoToSend);

      // Verificar si estamos editando o creando
      if (this.editingPlatoId()) {
        // Para edición, enviar todos los datos del formulario (no solo los cambiados)
        // Esto es más simple y evita problemas de comparación
        const updateData: any = {
          nombre: platoToSend.nombre,
          precio: platoToSend.precio,
          disponible: platoToSend.disponible,
          es_especial: platoToSend.es_especial,

        };

        // Agregar campos opcionales
        if (platoToSend.descripcion !== undefined) updateData.descripcion = platoToSend.descripcion;
        if (platoToSend.tiempo_preparacion_minutos !== undefined) updateData.tiempo_preparacion_minutos = platoToSend.tiempo_preparacion_minutos;
        if (platoToSend.imagen_url !== undefined) updateData.imagen_url = platoToSend.imagen_url;
        if (platoToSend.alergenos !== undefined) updateData.alergenos = platoToSend.alergenos;
        if (platoToSend.es_especial !== undefined) updateData.es_especial = platoToSend.es_especial;
        if (platoToSend.precios_por_tamano !== undefined) {
          updateData.precios_por_tamano = platoToSend.precios_por_tamano;
        } else {
          updateData.precios_por_tamano = null;
        }


        // Filtrar campos undefined o vacíos antes de enviar
        const cleanUpdateData: any = {};
        Object.keys(updateData).forEach(key => {
          if (updateData[key] !== undefined && updateData[key] !== '') {
            cleanUpdateData[key] = updateData[key];
          }
        });

        console.log('🔄 Actualizando plato con ID:', this.editingPlatoId());
        console.log('📦 Datos finales a enviar:', cleanUpdateData);

        // Actualizar plato existente
        this._platosService.update(this.editingPlatoId()!, cleanUpdateData).subscribe({
          next: (plato) => {
            console.log('Plato actualizado:', plato);
            alert(`Plato "${nombre}" actualizado exitosamente.`);
            this.closeAddPlatoModal();
  
            // Recargar la página para mostrar cambios
            window.location.reload();
          },
          error: (error) => {
            console.error('Error al actualizar plato:', error);
            console.error('Detalles del error:', error.error);
            console.error('Errores específicos:', error.error.errors);
            alert('Error al actualizar el plato. Revisa la consola para más detalles.');
          }
        });
      } else {
        // Crear nuevo plato
        this._platosService.create(platoToSend).subscribe({
          next: (plato) => {
            console.log('Plato creado:', plato);
            alert(`Plato "${nombre}" creado exitosamente.`);
            this.closeAddPlatoModal();
  
            // Recargar la página para mostrar cambios
            window.location.reload();
          },
          error: (error) => {
            console.error('Error al crear plato:', error);
            console.error('Detalles del error:', error.error);
            console.error('Errores específicos:', error.error.errors);
            alert('Error al crear el plato. Revisa la consola para más detalles.');
          }
        });
      }
    }
  }

  confirmDeleteCategoria() {
    const categoriaName = this.categoriaToDelete();
    console.log('Intentando eliminar categoría:', categoriaName);
    if (categoriaName && confirm(`¿Estás seguro de que quieres eliminar la categoría "${categoriaName}"?`)) {
      // Buscar la categoría en TODOS los resources disponibles
      const allCategorias = [
        ...(this.categoriasResource.value() || []),
        ...(this.categoriasInventarioResource.value() || [])
      ];
      console.log('Todas las categorías disponibles:', allCategorias);
      const categoria = allCategorias.find((c: any) => c.nombre === categoriaName);
      console.log('Categoría encontrada:', categoria);

      if (categoria && categoria.categoria_id) {
        // Eliminar la categoría usando la API
        this._categoriasService.delete(categoria.categoria_id).subscribe({
          next: () => {
            console.log('Categoría eliminada:', categoriaName);
            alert(`Categoría "${categoriaName}" eliminada exitosamente.`);
            this.closeDeleteCategoriaModal();

            // Recargar la página para mostrar cambios
            window.location.reload();
          },
          error: (error) => {
            console.error('Error al eliminar categoría:', error);
            alert('Error al eliminar la categoría. Inténtalo de nuevo.');
          }
        });
      } else {
        console.log('Categoría encontrada pero sin ID:', categoria);
        alert('No se pudo encontrar la categoría para eliminar.');
      }
    }
  }

  addCategoria() {
    const categoriaName = this.newCategoriaName().trim();
    if (categoriaName) {
      // Usar el tipo especificado en categoriaTipo
      const tipo = this.categoriaTipo();
      const rawSeccion = this.activeSeccion();
      const seccion = rawSeccion === 'Todos' ? 'Parrilla' : rawSeccion;

      console.log('Creando categoría:', categoriaName, 'tipo:', tipo, 'seccion:', seccion);

      // Crear la categoría usando la API
      this._categoriasService.create({
        nombre: categoriaName,
        descripcion: `Categoría ${categoriaName}`,
        tipo: tipo,
        seccion: seccion,
        activo: true
      }).subscribe({
        next: (categoria) => {
          console.log('Categoría creada exitosamente:', categoria);
          alert(`Categoría "${categoriaName}" agregada exitosamente.`);
          this.closeAddCategoriaModal();

          // Recargar la página para mostrar cambios
          window.location.reload();
        },
        error: (error) => {
          console.error('Error al crear categoría:', error);
          alert('Error al crear la categoría. Inténtalo de nuevo.');
        }
      });
    }
  }

  deletePlato(plato: Plato) {
    if (confirm(`¿Estás seguro de que quieres eliminar el plato "${plato.nombre}"?`)) {
      this._platosService.delete(plato.plato_id).subscribe({
        next: () => {
          alert(`Plato "${plato.nombre}" eliminado exitosamente.`);
          // Recargar los platos para mostrar cambios en tiempo real
          this.reloadTrigger$.next(this.reloadTrigger$.value + 1);
          // Forzar la detección de cambios para actualizar la vista
          this._cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al eliminar plato:', error);
          alert('Error al eliminar el plato. Inténtalo de nuevo.');
        }
      });
    }
  }

  /**
   * Cambia el estado de disponibilidad de un plato (disponible/agotado)
   */
  toggleEstadoPlato(plato: Plato, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    const newStatus = !plato.disponible;
    this._platosService.update(plato.plato_id, { disponible: newStatus }).subscribe({
      next: () => {
        this.reloadTrigger$.next(this.reloadTrigger$.value + 1);
        this._cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al cambiar estado del plato:', error);
        alert('No se pudo cambiar el estado del plato.');
      }
    });
  }

  toggleEspecialPlato(plato: Plato, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    const newStatus = !plato.es_especial;
    this._platosService.update(plato.plato_id, { es_especial: newStatus }).subscribe({
      next: () => {
        this.reloadTrigger$.next(this.reloadTrigger$.value + 1);
        this._cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al cambiar estado especial del plato:', error);
      }
    });
  }



  toggleQuickEditMode() {
    this.isQuickEditMode.set(!this.isQuickEditMode());
    this._cdr.detectChanges();
  }

  updatePlatoQuick(plato: Plato, field: string, event: Event) {
    let value: any;
    if (field === 'precio') {
      value = parseFloat((event.target as HTMLInputElement).value) || 0;
    } else {
      value = (event.target as HTMLInputElement).value;
    }

    if (value === plato[field as keyof Plato]) return;

    this._platosService.update(plato.plato_id, { [field]: value }).subscribe({
      next: () => {
        // Recargar silenciosamente
        this.reloadTrigger$.next(this.reloadTrigger$.value + 1);
        this._cdr.detectChanges();
      },
      error: (error) => {
        console.error(`Error al actualizar ${field} del plato:`, error);
      }
    });
  }

  createIngrediente() {
    const nombre = this.ingredienteNombre().trim().toLowerCase();
    const costoUnitario = this.ingredienteCostoUnitario();
    const stockMinimo = this.ingredienteStockMinimo();
    const stockMaximo = this.ingredienteStockMaximo();

    // Validación: stock máximo debe ser mayor al stock mínimo
    if (stockMaximo > 0 && stockMaximo <= stockMinimo) {
      alert('El stock máximo debe ser mayor al stock mínimo.');
      return;
    }

    // Verificar si ya existe un ingrediente con el mismo nombre
    const existingIngrediente = this.ingredientesResource.value()?.find(
      ing => ing.nombre.toLowerCase() === nombre
    );

    if (existingIngrediente && !this.editingIngredienteId()) {
      alert(`Ya existe un ingrediente con el nombre "${existingIngrediente.nombre}". Por favor, elige un nombre diferente.`);
      return;
    }

    if (nombre && costoUnitario > 0) {
      const ingredienteToSend: any = {
        nombre: nombre,
        costo_unitario: costoUnitario,
        stock_actual: this.ingredienteStockActual(),
        stock_minimo: stockMinimo,
        activo: this.ingredienteActivo(),
        estado: this.ingredienteEstado()
      };

      if (this.ingredienteCategoria().trim()) {
        ingredienteToSend.categoria = this.ingredienteCategoria().trim();
      }
      if (this.ingredienteUnidadMedida().trim()) {
        ingredienteToSend.unidad_medida = this.ingredienteUnidadMedida().trim();
      }
      if (stockMaximo > 0) {
        ingredienteToSend.stock_maximo = stockMaximo;
      }
      if (this.ingredienteDescripcion().trim()) {
        ingredienteToSend.descripcion = this.ingredienteDescripcion().trim();
      }

      console.log('Datos a enviar:', ingredienteToSend);
      console.log('Modo edición:', this.editingIngredienteId());

      if (this.editingIngredienteId()) {
        // Para edición, verificar si el nombre cambió y si ya existe
        const currentIngrediente = this.ingredientesResource.value()?.find(
          ing => ing.ingrediente_id === this.editingIngredienteId()
        );

        if (currentIngrediente && currentIngrediente.nombre.toLowerCase() !== nombre) {
          const existingIngrediente = this.ingredientesResource.value()?.find(
            ing => ing.nombre.toLowerCase() === nombre && ing.ingrediente_id !== this.editingIngredienteId()
          );

          if (existingIngrediente) {
            alert(`Ya existe un ingrediente con el nombre "${existingIngrediente.nombre}". Por favor, elige un nombre diferente.`);
            return;
          }
        }

        const updateData: any = {};
        Object.keys(ingredienteToSend).forEach(key => {
          if (ingredienteToSend[key] !== undefined && ingredienteToSend[key] !== '') {
            updateData[key] = ingredienteToSend[key];
          }
        });

        console.log('Datos de actualización:', updateData);

        this._ingredientesService.update(this.editingIngredienteId()!, updateData).subscribe({
          next: (ingrediente) => {
            console.log('Ingrediente actualizado:', ingrediente);
            alert(`Ingrediente "${nombre}" actualizado exitosamente.`);
            this.closeAddIngredienteModal();
            this.reloadTrigger$.next(this.reloadTrigger$.value + 1);
            this.ingredientesResource.reload();
            this._cdr.detectChanges();
          },
          error: (error) => {
            console.error('Error al actualizar ingrediente:', error);
            alert('Error al actualizar el ingrediente. Revisa la consola para más detalles.');
          }
        });
      } else {
        this._ingredientesService.create(ingredienteToSend).subscribe({
          next: (ingrediente) => {
            console.log('Ingrediente creado:', ingrediente);
            alert(`Ingrediente "${nombre}" creado exitosamente.`);
            this.closeAddIngredienteModal();
            this.reloadTrigger$.next(this.reloadTrigger$.value + 1);
            this.ingredientesResource.reload();
            this._cdr.detectChanges();
          },
          error: (error) => {
            console.error('Error al crear ingrediente:', error);
            alert('Error al crear el ingrediente. Revisa la consola para más detalles.');
          }
        });
      }
    }
  }

  deleteIngrediente(ingrediente: Ingrediente) {
    const id = ingrediente.ingrediente_id || (ingrediente as any).id;
    if (!id) {
      alert('Error: No se pudo identificar el ID del ingrediente.');
      return;
    }
    if (confirm(`¿Estás seguro de que quieres eliminar el ingrediente "${ingrediente.nombre}"?`)) {
      this._ingredientesService.delete(id).subscribe({
        next: () => {
          alert(`Ingrediente "${ingrediente.nombre}" eliminado exitosamente.`);
          this.reloadTrigger$.next(this.reloadTrigger$.value + 1);
          this.ingredientesResource.reload();
          this._cdr.detectChanges();
        },
        error: (error: any) => {
          console.error('Error al eliminar ingrediente:', error);
          const errorMsg = error.error?.data || error.error?.message || error.message || 'Error al eliminar el ingrediente.';
          alert(`Error al eliminar ingrediente: ${errorMsg}`);
        }
      });
    }
  }

  toggleIngredienteStatus(ingrediente: Ingrediente) {
    const id = ingrediente.ingrediente_id || (ingrediente as any).id;
    if (!id) {
      alert('Error: No se pudo identificar el ID del ingrediente.');
      return;
    }
    const newStatus = !ingrediente.activo;
    const action = newStatus ? 'activar' : 'desactivar';
    
    if (confirm(`¿Estás seguro de que quieres ${action} el ingrediente "${ingrediente.nombre}"?`)) {
      this._ingredientesService.update(id, { activo: newStatus }).subscribe({
        next: () => {
          alert(`Ingrediente "${ingrediente.nombre}" ${newStatus ? 'activado' : 'desactivado'} exitosamente.`);
          this.reloadTrigger$.next(this.reloadTrigger$.value + 1);
          this.ingredientesResource.reload();
          this._cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al cambiar el estado del ingrediente:', error);
          alert('Error al cambiar el estado del ingrediente. Inténtalo de nuevo.');
        }
      });
    }
  }

  cycleIngredienteStatus(ingrediente: Ingrediente) {
    const currentStatus = ingrediente.stock || 'NORMAL';
    let newStatus: 'NORMAL' | 'BAJO' | 'CRITICO' | 'ALTO';
    
    // Ciclo: NORMAL -> BAJO -> CRITICO -> ALTO -> NORMAL
    switch (currentStatus) {
      case 'NORMAL':
        newStatus = 'BAJO';
        break;
      case 'BAJO':
        newStatus = 'CRITICO';
        break;
      case 'CRITICO':
        newStatus = 'ALTO';
        break;
      case 'ALTO':
        newStatus = 'NORMAL';
        break;
      default:
        newStatus = 'NORMAL';
    }
    
    const statusLabels: Record<string, string> = {
      'NORMAL': 'Normal',
      'BAJO': 'Poco Stock',
      'CRITICO': 'Agotado',
      'ALTO': 'Alto Stock'
    };
    
    if (confirm(`¿Cambiar el estado del ingrediente "${ingrediente.nombre}" a "${statusLabels[newStatus]}"?`)) {
      this._ingredientesService.update(ingrediente.ingrediente_id, { estado: newStatus }).subscribe({
        next: () => {
          alert(`Estado del ingrediente "${ingrediente.nombre}" cambiado a "${statusLabels[newStatus]}" exitosamente.`);
          this.reloadTrigger$.next(this.reloadTrigger$.value + 1);
          this._cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al cambiar el estado del ingrediente:', error);
          alert('Error al cambiar el estado del ingrediente. Inténtalo de nuevo.');
        }
      });
    }
  }

  getStatusTooltip(ingrediente: Ingrediente): string {
    const currentStatus = ingrediente.stock || 'NORMAL';
    let nextStatus: string;
    
    const statusLabels: Record<string, string> = {
      'NORMAL': 'Normal',
      'BAJO': 'Poco Stock',
      'CRITICO': 'Agotado',
      'ALTO': 'Alto Stock'
    };
    
    switch (currentStatus) {
      case 'NORMAL':
        nextStatus = 'Poco Stock';
        break;
      case 'BAJO':
        nextStatus = 'Agotado';
        break;
      case 'CRITICO':
        nextStatus = 'Alto Stock';
        break;
      case 'ALTO':
        nextStatus = 'Normal';
        break;
      default:
        nextStatus = 'Normal';
    }
    
    return `Cambiar a "${nextStatus}"`;
  }

  setIngredienteStatus(ingrediente: Ingrediente, newStatus: 'NORMAL' | 'BAJO' | 'CRITICO' | 'ALTO') {
    const statusLabels: Record<string, string> = {
      'NORMAL': 'Normal',
      'BAJO': 'Poco Stock',
      'CRITICO': 'Agotado',
      'ALTO': 'Alto Stock'
    };
    
    this._ingredientesService.update(ingrediente.ingrediente_id, { estado: newStatus }).subscribe({
      next: () => {
        alert(`Estado del ingrediente "${ingrediente.nombre}" cambiado a "${statusLabels[newStatus]}" exitosamente.`);
        this.reloadTrigger$.next(this.reloadTrigger$.value + 1);
        this._cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al cambiar el estado del ingrediente:', error);
        alert('Error al cambiar el estado del ingrediente. Inténtalo de nuevo.');
      }
    });
  }

  editIngrediente(ingrediente: Ingrediente) {
    this.editingIngredienteId.set(ingrediente.ingrediente_id);
    this.ingredienteNombre.set(ingrediente.nombre);
    this.ingredienteCategoria.set(ingrediente.categoria || '');
    this.ingredienteUnidadMedida.set(ingrediente.unidad_medida || '');
    this.ingredienteStockActual.set(ingrediente.stock_actual);
    this.ingredienteStockMinimo.set(ingrediente.stock_minimo);
    this.ingredienteStockMaximo.set(ingrediente.stock_maximo || 0);
    this.ingredienteCostoUnitario.set(ingrediente.costo_unitario);
    this.ingredienteDescripcion.set(ingrediente.descripcion || '');
    this.ingredienteActivo.set(ingrediente.activo);
    this.ingredienteEstado.set(ingrediente.estado || '');

    this.showAddIngredienteModal.set(true);
  }

  getPreciosPorTamano(plato: Plato): Record<string, number> {
    if (!plato.precios_por_tamano) return {};
    let pxt = plato.precios_por_tamano;
    if (typeof pxt === 'string') {
      try {
        pxt = JSON.parse(pxt);
      } catch (e) {
        console.error('Error parsing precios_por_tamano JSON:', e);
        pxt = {};
      }
    }
    return (pxt as any) || {};
  }

  editPlato(plato: Plato) {
    // Establecer el ID del plato que estamos editando
    this.editingPlatoId.set(plato.plato_id);

    // Abrir modal de edición con los datos del plato
    this.nombre.set(plato.nombre);
    this.descripcion.set(plato.descripcion || '');
    this.precio.set(plato.precio);
    this.categoria.set(plato.categoria || '');
    this.disponible.set(plato.disponible);

    this.tiempo_preparacion_minutos.set(plato.tiempo_preparacion_minutos || 0);
    this.imagen_url.set(plato.imagen_url || '');
    this.es_especial.set(plato.es_especial || false);
    this.alergenos.set(plato.alergenos || []);

    // Precios por tamaño
    const pxt = this.getPreciosPorTamano(plato);
    this.precioPersonal.set(pxt['Personal'] || 0);
    this.precioMediana.set(pxt['Mediana'] || 0);
    this.precioGrande.set(pxt['Grande'] || 0);
    this.precioExtragrande.set(pxt['Extragrande'] || 0);
    this.precioGigante.set(pxt['Gigante'] || 0);
    this.precioFamiliar.set(pxt['Familiar'] || 0);

    // Abrir el modal de edición
    this.showAddPlatoModal.set(true);
  }


  getPlatosByCategoria(): Record<string, Plato[]> {
    let platos = this.platosResource.value() || [];
    const term = this.searchTerm().trim().toLowerCase();

    if (term) {
      platos = platos.filter(p => p.nombre.toLowerCase().includes(term) || (p.descripcion && p.descripcion.toLowerCase().includes(term)));
    }

    // Si vienen como array plano, agruparlos por categoría
    if (Array.isArray(platos)) {
      const grouped = platos.reduce((acc, plato) => {
        const categoria = plato.categoria || 'Sin Categoría';
        if (!acc[categoria]) {
          acc[categoria] = [];
        }
        acc[categoria].push(plato);
        return acc;
      }, {} as Record<string, Plato[]>);

      // Asegurar que todas las categorías de categoriasKeys estén presentes
      const categoriasKeys = this.categoriasKeys;
      categoriasKeys.forEach(categoria => {
        if (!grouped[categoria]) {
          grouped[categoria] = [];
        }
      });

      return grouped;
    }

    // Si ya vienen agrupados por categoría desde la API (como en la respuesta actual)
    return platos as Record<string, Plato[]>;
  }

  updatePrecio(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.precio.set(value);
  }

  updateTiempoPreparacion(event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value) || 0;
    this.tiempo_preparacion_minutos.set(value);
  }

  updateNombre(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.nombre.set(value);
  }

  updateDescripcion(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.descripcion.set(value);
  }

  updateCategoria(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.categoria.set(value);
  }


  async takePhoto(): Promise<void> {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

      const photo = await Camera.getPhoto({
        source: CameraSource.Camera,
        resultType: CameraResultType.Uri,
        quality: 80,
        saveToGallery: true,
        correctOrientation: true,
        allowEditing: false,
      });

      await this.processImageFile(photo);
    } catch (error) {
      console.error('Error al tomar la foto:', error);
    }
  }

  async selectFromGallery(): Promise<void> {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

      const photo = await Camera.getPhoto({
        source: CameraSource.Photos,
        resultType: CameraResultType.Uri,
        quality: 80,
        allowEditing: false,
      });

      await this.processImageFile(photo);
    } catch (error) {
      console.error('Error al seleccionar de la galería:', error);
    }
  }

  private async processImageFile(photo: any): Promise<void> {
    try {
      // Convertir la URI de Capacitor a un Blob
      const response = await fetch(photo.webPath);
      const blob = await response.blob();

      // Convertir el Blob a un File
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });

      // Comprimir la imagen a base64 (como en el perfil)
      const compressedBase64 = await this.compressImage(file);
      
      // Set the local signal to show the preview
      this.imagen_url.set(compressedBase64);
      console.log('✅ Imagen procesada y guardada localmente (señal actualizada)');
    } catch (error) {
      console.error('Error al procesar la imagen:', error);
      alert('Error al procesar la imagen. Inténtalo de nuevo.');
    }
  }

  private compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for compression
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Calculate new dimensions (max 800x800)
          const maxSize = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx?.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression (0.7 quality)
          let compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);

          // Check final size (should be under ~500KB after compression)
          const sizeInBytes = compressedDataUrl.length * (3 / 4);
          if (sizeInBytes > 500 * 1024) {
            // Further compress if still too large
            compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
          }
          
          resolve(compressedDataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  clearImage(): void {
    this.imagen_url.set('');
  }

  updateDisponible(event: Event) {
    const value = (event.target as HTMLInputElement).checked;
    this.disponible.set(value);
  }

  updateAlergenos(event: Event) {
    const value = (event.target as HTMLInputElement).value.split(',').map((a: string) => a.trim()).filter((a: string) => a);
    this.alergenos.set(value);
  }

  updateSearchTerm(event: Event) {
    // Función de búsqueda eliminada - usar búsqueda simple en el template
  }

  get categoriasKeys(): string[] {
    const seccion = this.activeSeccion();
    const isParrilla = seccion === 'Parrilla';
    const isPizzas = seccion === 'Pizzas';
    const isBebidas = seccion === 'Bebidas';
    if (this.activeTab() === 'menu') {
      const categoriasResourceValue = this.categoriasMenuResource.value();
      return Array.isArray(categoriasResourceValue)
        ? categoriasResourceValue
            .filter((c: any) => seccion === 'Todos' ? true : (isParrilla ? (c.seccion === 'Parrilla' || !c.seccion) : (isPizzas ? c.seccion === 'Pizzas' : c.seccion === 'Bebidas')))
            .map((c: any) => c.nombre)
        : [];
    } else {
      const categoriasResourceValue = this.categoriasInventarioResource.value();
      return Array.isArray(categoriasResourceValue)
        ? categoriasResourceValue
            .filter((c: any) => seccion === 'Todos' ? true : (isParrilla ? (c.seccion === 'Parrilla' || !c.seccion) : (isPizzas ? c.seccion === 'Pizzas' : c.seccion === 'Bebidas')))
            .map((c: any) => c.nombre)
        : [];
    }
  }

  get categoriasInventarioKeys(): string[] {
    const categoriasResourceValue = this.categoriasInventarioResource.value();
    const categoriasFromDB = Array.isArray(categoriasResourceValue)
      ? categoriasResourceValue.map((c: any) => c.nombre)
      : [];
    console.log('Categorías de inventario disponibles:', categoriasFromDB);
    // Solo mostrar categorías de inventario de la base de datos
    return categoriasFromDB;
  }

  updateIngredienteNombre(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.ingredienteNombre.set(value);
  }

  updateIngredienteCategoria(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.ingredienteCategoria.set(value);
  }

  updateIngredienteUnidadMedida(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.ingredienteUnidadMedida.set(value);
  }

  updateIngredienteStockActual(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.ingredienteStockActual.set(value);
  }

  updateIngredienteStockMinimo(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.ingredienteStockMinimo.set(value);
  }

  updateIngredienteStockMaximo(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.ingredienteStockMaximo.set(value);
  }

  updateIngredienteCostoUnitario(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.ingredienteCostoUnitario.set(value);
  }

  updateIngredienteDescripcion(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.ingredienteDescripcion.set(value);
  }

  updateIngredienteActivo(event: Event) {
    const value = (event.target as HTMLInputElement).checked;
    this.ingredienteActivo.set(value);
  }

  updateIngredienteEstado(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.ingredienteEstado.set(value);
  }

  // Generar PDF del inventario
  generarPDFInventario() {
    const ingredientes = this.ingredientesResource.value();
    if (!ingredientes || ingredientes.length === 0) {
      alert('No hay ingredientes para generar el PDF');
      return;
    }

    // Obtener estadísticas
    this._ingredientesService.getEstadisticas().subscribe({
      next: (estadisticas) => {
        this.crearPDF(ingredientes, estadisticas);
      },
      error: (error) => {
        console.error('Error al obtener estadísticas:', error);
        // Generar PDF sin estadísticas si falla
        this.crearPDF(ingredientes, null);
      }
    });
  }

  private crearPDF(ingredientes: Ingrediente[], estadisticas: EstadisticasInventario | null) {
    const doc = new jsPDF();
    const fechaActual = new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Título
    doc.setFontSize(20);
    doc.setTextColor(234, 88, 12); // Orange-500
    doc.text('Reporte de Inventario', 105, 20, { align: 'center' });

    // Fecha
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Fecha de generación: ${fechaActual}`, 105, 28, { align: 'center' });

    // Estadísticas
    let yPos = 40;
    if (estadisticas) {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Resumen del Inventario', 14, yPos);
      yPos += 10;

      doc.setFontSize(11);
      doc.setTextColor(0);
      
      const stats = [
        `Total de ingredientes: ${estadisticas.total_ingredientes}`,
        `Valor total del inventario: ${estadisticas.valor_total_inventario.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`,
        `Ingredientes críticos: ${estadisticas.ingredientes_criticos}`,
        `Ingredientes con stock bajo: ${estadisticas.ingredientes_bajos_stock}`,
        `Ingredientes en stock normal: ${estadisticas.ingredientes_normales}`
      ];

      stats.forEach((stat) => {
        doc.text(stat, 14, yPos);
        yPos += 7;
      });
    }

    yPos += 5;

    // Tabla de ingredientes
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Detalle de Ingredientes', 14, yPos);
    yPos += 5;

    const tableData = ingredientes.map(ing => [
      ing.nombre,
      ing.categoria || 'Sin categoría',
      `${ing.stock_actual} ${ing.unidad_medida || 'und'}`,
      `${Number(ing.costo_unitario).toLocaleString('es-CO', { minimumFractionDigits: 2 })}`,
      `${Number(ing.valor_total).toLocaleString('es-CO', { minimumFractionDigits: 2 })}`,
      ing.stock
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Nombre', 'Categoría', 'Cantidad', 'Costo Unit.', 'Valor Total', 'Stock']],
      body: tableData,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [234, 88, 12], // Orange-500
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 25 },
        2: { cellWidth: 20 },
        3: { cellWidth: 22 },
        4: { cellWidth: 22 },
        5: { cellWidth: 20 }
      },
      didParseCell: (data: any) => {
        // Color para el estado de stock
        if (data.section === 'body' && data.column.index === 5) {
          const stock = data.cell.raw as string;
          if (stock === 'CRITICO') {
            data.cell.styles.textColor = [220, 38, 38]; // Red
            data.cell.styles.fontStyle = 'bold';
          } else if (stock === 'BAJO') {
            data.cell.styles.textColor = [234, 179, 8]; // Yellow
            data.cell.styles.fontStyle = 'bold';
          } else if (stock === 'NORMAL') {
            data.cell.styles.textColor = [22, 163, 74]; // Green
          } else if (stock === 'ALTO') {
            data.cell.styles.textColor = [37, 99, 235]; // Blue
          }
        }
      }
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Yiyo Burger - Página ${i} de ${pageCount}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    // Descargar PDF
    const nombreArchivo = `inventario_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(nombreArchivo);
  }

  // ===== PROVEEDORES METHODS =====
  loadProveedores() {
    this._proveedoresService.getAll().subscribe({
      next: (data) => { this.proveedores.set(data); this._cdr.detectChanges(); },
      error: (err) => console.error('Error cargando proveedores:', err)
    });
  }

  loadOrdenesCompra() {
    this._proveedoresService.getAllOrdenes().subscribe({
      next: (data) => { this.ordenesCompra.set(data); this._cdr.detectChanges(); },
      error: (err) => console.error('Error cargando órdenes:', err)
    });
  }

  loadFacturas() {
    this._proveedoresService.getFacturas().subscribe({
      next: (data) => { this.facturas.set(data); this._cdr.detectChanges(); },
      error: (err) => console.error('Error cargando facturas:', err)
    });
  }

  loadAllProveedoresData() {
    this.loadProveedores();
    this.loadOrdenesCompra();
    this.loadFacturas();
  }

  setProveedoresSubTab(tab: 'directorio' | 'pedidos' | 'facturas') {
    this.proveedoresSubTab.set(tab);
    this.loadAllProveedoresData();
  }

  get filteredProveedores(): Proveedor[] {
    const s = this.proveedoresSearch().toLowerCase();
    if (!s) return this.proveedores();
    return this.proveedores().filter(p =>
      p.razon_social.toLowerCase().includes(s) ||
      p.nit.toLowerCase().includes(s) ||
      (p.categoria || '').toLowerCase().includes(s)
    );
  }

  get filteredFacturas(): FacturaProveedor[] {
    const s = this.facturasSearch().toLowerCase();
    if (!s) return this.facturas();
    return this.facturas().filter(f =>
      f.num_factura.toLowerCase().includes(s) ||
      (f.proveedor_nombre || '').toLowerCase().includes(s)
    );
  }

  getProveedor(id: number): Proveedor | undefined {
    return this.proveedores().find(p => p.id === id);
  }

  openOrdenDetailModal(oc: OrdenCompra) {
    this.selectedOrdenDetail.set(oc);
    const fact = this.facturas().find(f => f.orden_compra_id === oc.id);
    this.selectedOrdenFactura.set(fact || null);
    this.showOrdenDetailModal.set(true);
  }

  openFacturaDetailModal(fact: FacturaProveedor) {
    const oc = this.ordenesCompra().find(o => o.id === fact.orden_compra_id);
    if (oc) {
      this.openOrdenDetailModal(oc);
    } else {
      this.selectedOrdenFactura.set(fact);
      this.selectedOrdenDetail.set({
        id: fact.orden_compra_id || fact.id,
        proveedor_id: fact.proveedor_id,
        estado: 'Recibido',
        total_estimado: fact.total,
        foto_factura: fact.foto_factura,
        items: []
      });
      this.showOrdenDetailModal.set(true);
    }
  }

  closeOrdenDetailModal() {
    this.showOrdenDetailModal.set(false);
    this.selectedOrdenDetail.set(null);
    this.selectedOrdenFactura.set(null);
  }

  // --- Proveedor CRUD modals ---
  openProveedorModal(prov?: Proveedor) {
    if (prov) {
      this.editingProveedorId.set(prov.id || null);
      this.provRazonSocial.set(prov.razon_social);
      this.provNit.set(prov.nit);
      this.provContacto.set(prov.contacto || '');
      this.provTelefono.set(prov.telefono || '');
      this.provCorreo.set(prov.correo || '');
      this.provDireccion.set(prov.direccion || '');
      this.provCategoria.set(prov.categoria || '');
      this.provBanco.set(prov.datos_bancarios_banco || '');
      this.provTipoCuenta.set(prov.datos_bancarios_tipo || '');
      this.provNumeroCuenta.set(prov.datos_bancarios_numero || '');
      this.provDiasPlazo.set(prov.dias_plazo || 0);
    } else {
      this.editingProveedorId.set(null);
      this.provRazonSocial.set('');
      this.provNit.set('');
      this.provContacto.set('');
      this.provTelefono.set('');
      this.provCorreo.set('');
      this.provDireccion.set('');
      this.provCategoria.set('');
      this.provBanco.set('');
      this.provTipoCuenta.set('');
      this.provNumeroCuenta.set('');
      this.provDiasPlazo.set(0);
    }
    this.showProveedorModal.set(true);
  }

  closeProveedorModal() {
    this.showProveedorModal.set(false);
  }

  saveProveedor() {
    const payload: Proveedor = {
      razon_social: this.provRazonSocial(),
      nit: this.provNit(),
      contacto: this.provContacto(),
      telefono: this.provTelefono(),
      correo: this.provCorreo(),
      direccion: this.provDireccion(),
      categoria: this.provCategoria(),
      datos_bancarios_banco: this.provBanco(),
      datos_bancarios_tipo: this.provTipoCuenta(),
      datos_bancarios_numero: this.provNumeroCuenta(),
      dias_plazo: this.provDiasPlazo(),
    };

    const id = this.editingProveedorId();
    const obs = id
      ? this._proveedoresService.update(id, payload)
      : this._proveedoresService.create(payload);

    obs.subscribe({
      next: () => {
        this.closeProveedorModal();
        this.loadProveedores();
        alert(id ? 'Proveedor actualizado.' : 'Proveedor creado exitosamente.');
      },
      error: (err) => alert(err.error?.error || 'Error al guardar proveedor.')
    });
  }

  toggleProveedorStatus(prov: Proveedor) {
    if (!prov.id) return;
    const newStatus = !prov.activo;
    const action = newStatus ? 'activar' : 'desactivar';
    if (!confirm(`¿Estás seguro de que quieres ${action} al proveedor "${prov.razon_social}"?`)) return;
    this._proveedoresService.update(prov.id, { activo: newStatus }).subscribe({
      next: () => {
        this.loadProveedores();
        alert(`Proveedor "${prov.razon_social}" ${newStatus ? 'activado' : 'desactivado'} exitosamente.`);
      },
      error: (err: any) => alert(err.error?.error || 'Error al cambiar estado del proveedor.')
    });
  }

  deleteProveedor(prov: Proveedor) {
    if (!prov.id) return;
    if (!confirm(`¿Estás seguro de eliminar permanentemente al proveedor "${prov.razon_social}"?`)) return;
    this._proveedoresService.delete(prov.id).subscribe({
      next: () => {
        this.loadProveedores();
        alert(`Proveedor "${prov.razon_social}" eliminado exitosamente.`);
      },
      error: (err: any) => alert(err.error?.error || 'Error al eliminar proveedor.')
    });
  }

  // --- Orden Compra modals ---
  openOrdenCompraModal() {
    this.ocProveedorId.set(0);
    this.ocFechaEntrega.set('');
    this.ocFotoFactura.set('');
    this.ocItems.set([]);
    this.showOrdenCompraModal.set(true);
  }

  closeOrdenCompraModal() {
    this.showOrdenCompraModal.set(false);
    this.ocFotoFactura.set('');
  }

  onFotoFacturaSelected(event: Event, target: 'oc' | 'recepcion') {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        if (target === 'oc') {
          this.ocFotoFactura.set(base64);
        } else {
          this.recepcionFotoFactura.set(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  removeFotoFactura(target: 'oc' | 'recepcion') {
    if (target === 'oc') {
      this.ocFotoFactura.set('');
    } else {
      this.recepcionFotoFactura.set('');
    }
  }

  addOcItem() {
    this.ocItems.set([...this.ocItems(), {
      ingrediente_id: 0,
      nombre: '',
      cantidad_compra: 1,
      unidad_compra: 'unidad',
      costo_compra: 0,
      factor_conversion: 1,
      unidad_stock: 'kg'
    }]);
  }

  removeOcItem(index: number) {
    const items = [...this.ocItems()];
    items.splice(index, 1);
    this.ocItems.set(items);
  }

  updateOcItem(index: number, field: string, value: any) {
    const items = [...this.ocItems()];
    (items[index] as any)[field] = value;
    // Si seleccionó un ingrediente del listado, actualizar nombre y costo
    if (field === 'ingrediente_id') {
      const ingId = Number(value);
      const ing = (this.ingredientesResource.value() || []).find((i: any) => (i.ingrediente_id || i.id) === ingId);
      if (ing) {
        items[index].nombre = ing.nombre;
        items[index].unidad_stock = ing.unidad_medida || 'unidad';
        if (ing.costo_unitario && !items[index].costo_compra) {
          items[index].costo_compra = Number(ing.costo_unitario);
        }
      }
    }
    this.ocItems.set(items);
  }

  get ocTotalEstimado(): number {
    return this.ocItems().reduce((sum, i) => sum + (i.cantidad_compra * i.costo_compra), 0);
  }

  saveOrdenCompra() {
    if (!this.ocProveedorId() || this.ocItems().length === 0) {
      alert('Seleccione un proveedor y al menos un insumo.');
      return;
    }
    const payload: any = {
      proveedor_id: this.ocProveedorId(),
      fecha_entrega_estimada: this.ocFechaEntrega() || null,
      total_estimado: this.ocTotalEstimado,
      foto_factura: this.ocFotoFactura() || null,
      items: this.ocItems()
    };
    this._proveedoresService.createOrden(payload).subscribe({
      next: () => {
        this.closeOrdenCompraModal();
        this.loadAllProveedoresData();
        alert('Orden de compra creada exitosamente.');
      },
      error: (err) => alert(err.error?.error || 'Error al crear orden de compra.')
    });
  }

  // --- Recepción de pedido ---
  openRecepcionModal(oc: OrdenCompra) {
    this.recepcionOrdenId.set(oc.id!);
    this.recepcionOrden.set(oc);
    this.recepcionNumFactura.set('');
    this.recepcionFotoFactura.set(oc.foto_factura || '');
    this.recepcionFechaEmision.set(new Date().toISOString().split('T')[0]);
    const items = (oc.items || []).map(i => {
      let costo = Number(i.costo_compra) || 0;
      if (costo === 0) {
        const ing = (this.ingredientesResource.value() || []).find((ingItem: any) => (ingItem.ingrediente_id || ingItem.id) === Number(i.ingrediente_id));
        if (ing && ing.costo_unitario) {
          costo = Number(ing.costo_unitario);
        }
      }
      return {
        ingrediente_id: i.ingrediente_id,
        nombre: i.nombre,
        cantidad_solicitada: i.cantidad_compra,
        cantidad_recibida: i.cantidad_compra,
        merma: 0,
        costo_real: costo,
        checked: false
      };
    });
    this.recepcionItems.set(items);
    this.showRecepcionModal.set(true);
  }

  closeRecepcionModal() {
    this.showRecepcionModal.set(false);
    this.recepcionFotoFactura.set('');
  }

  toggleRecepcionCheck(index: number) {
    const items = [...this.recepcionItems()];
    items[index] = { ...items[index], checked: !items[index].checked };
    this.recepcionItems.set(items);
  }

  updateRecepcionItem(index: number, field: string, value: any) {
    const items = [...this.recepcionItems()];
    (items[index] as any)[field] = Number(value) || 0;
    this.recepcionItems.set(items);
  }

  get allRecepcionChecked(): boolean {
    return this.recepcionItems().length > 0 && this.recepcionItems().every(i => i.checked);
  }

  confirmarRecepcion() {
    if (!this.recepcionNumFactura().trim()) {
      alert('Ingrese el número de factura del proveedor.');
      return;
    }
    if (!this.allRecepcionChecked) {
      alert('Debe verificar (✓) todos los items antes de confirmar la recepción.');
      return;
    }

    const payload = {
      ordenId: this.recepcionOrdenId(),
      numFactura: this.recepcionNumFactura(),
      fechaEmision: this.recepcionFechaEmision(),
      fotoFactura: this.recepcionFotoFactura() || undefined,
      receivedItems: this.recepcionItems().map(i => ({
        ingrediente_id: i.ingrediente_id,
        cantidad_recibida: i.cantidad_recibida,
        merma: i.merma,
        costo_real: i.costo_real
      }))
    };

    this._proveedoresService.registrarRecepcion(payload).subscribe({
      next: () => {
        this.closeRecepcionModal();
        this.loadAllProveedoresData();
        this.reloadTrigger$.next(this.reloadTrigger$.value + 1);
        this.ingredientesResource.reload();
        alert('Recepción registrada exitosamente. Factura generada en Cuentas por Pagar e Inventario actualizado.');
      },
      error: (err) => alert(err.error?.error || 'Error al registrar la recepción.')
    });
  }

  // --- Pagos ---
  pagoFacturaSelected = signal<FacturaProveedor | null>(null);

  openPagoModal(fact: FacturaProveedor) {
    this.pagoFacturaSelected.set(fact);
    this.pagoFacturaId.set(fact.id!);
    this.pagoFacturaSaldo.set(Number(fact.saldo_pendiente));
    this.pagoMonto.set(Number(fact.saldo_pendiente));
    this.pagoMetodo.set('Efectivo');
    this.showPagoModal.set(true);
  }

  closePagoModal() {
    this.showPagoModal.set(false);
    this.pagoFacturaSelected.set(null);
  }

  getPagoFacturaFoto(): string | null {
    const fact = this.pagoFacturaSelected();
    if (!fact) return null;
    if (fact.foto_factura) return fact.foto_factura;
    if (fact.orden_compra_id) {
      const oc = this.ordenesCompra().find(o => o.id === fact.orden_compra_id);
      if (oc?.foto_factura) return oc.foto_factura;
    }
    return null;
  }

  confirmarPago() {
    if (this.pagoMonto() <= 0) {
      alert('Ingrese un monto válido.');
      return;
    }
    this._proveedoresService.pagarFactura(this.pagoFacturaId(), {
      monto: this.pagoMonto(),
      metodo_pago: this.pagoMetodo()
    }).subscribe({
      next: () => {
        this.closePagoModal();
        this.loadFacturas();
        this.loadProveedores();
        alert('Pago registrado exitosamente.');
      },
      error: (err) => alert(err.error?.error || 'Error al registrar pago.')
    });
  }

  getProveedorNombre(id: number): string {
    const p = this.proveedores().find(prov => prov.id === id);
    return p ? p.razon_social : 'Desconocido';
  }

  isVencidaProxima(fact: FacturaProveedor): boolean {
    if (fact.estado_pago === 'Pagado') return false;
    const hoy = new Date();
    const venc = new Date(fact.fecha_vencimiento);
    const diff = venc.getTime() - hoy.getTime();
    const horasRestantes = diff / (1000 * 60 * 60);
    return horasRestantes <= 48 && horasRestantes > 0;
  }

}

export default AdminInventarioPageComponent;
