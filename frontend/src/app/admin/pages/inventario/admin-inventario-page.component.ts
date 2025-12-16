import { InventarioService } from '@admin/services/inventario.service';
import { IngredientesService, Ingrediente } from '@admin/services/ingredientes.service';
import { PlatosService, Plato } from '@admin/services/platos.service';
import { CategoriasService, Categoria } from '@admin/services/categorias.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ChangeDetectionStrategy,
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
import { CurrencyPipe } from '@shared/pipes';
import { AdminInventarioTableComponent } from './components';
import { Capacitor } from '@capacitor/core';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'admin-inventario-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IsEmptyComponent,
    IsErrorComponent,
    IsLoadingComponent,
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
  private _cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private reloadTrigger$ = new BehaviorSubject(0);
  private categoriasReloadTrigger$ = new BehaviorSubject(0);

  activeTab = signal<'menu' | 'inventario'>('menu');
  selectedCategoria = signal<string | null>(null);
  showAddCategoriaModal = signal(false);
  showDeleteCategoriaModal = signal(false);
  showAddPlatoModal = signal(false);
  showEditPlatoModal = signal(false);
  editingPlatoId = signal<number | null>(null);
  newCategoriaName = signal('');
  categoriaToDelete = signal('');
  categoriaTipo = signal<'menu' | 'inventario'>('menu');

  // Campos para platos
  nombre = signal('');
  descripcion = signal('');
  precio = signal(0);
  categoria = signal('');
  disponible = signal(true);
  tiempo_preparacion_minutos = signal(0);
  imagen_url = signal('');
  alergenos = signal([] as string[]);

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
    this.alergenos.set([]);
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
    this.alergenos.set([]);
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
  }

  createPlato() {
    const nombre = this.nombre();
    const precio = this.precio();
    if (nombre.trim() && precio > 0) {
      // Preparar los datos del plato
      const platoToSend: any = {
        nombre: nombre.trim(),
        precio: precio,
        disponible: this.disponible()
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

      console.log('Datos a enviar:', platoToSend);

      // Verificar si estamos editando o creando
      if (this.editingPlatoId()) {
        // Para edición, enviar todos los datos del formulario (no solo los cambiados)
        // Esto es más simple y evita problemas de comparación
        const updateData: any = {
          nombre: platoToSend.nombre,
          precio: platoToSend.precio,
          disponible: platoToSend.disponible
        };

        // Agregar campos opcionales
        if (platoToSend.descripcion !== undefined) updateData.descripcion = platoToSend.descripcion;
        if (platoToSend.tiempo_preparacion_minutos !== undefined) updateData.tiempo_preparacion_minutos = platoToSend.tiempo_preparacion_minutos;
        if (platoToSend.imagen_url !== undefined) updateData.imagen_url = platoToSend.imagen_url;
        if (platoToSend.alergenos !== undefined) updateData.alergenos = platoToSend.alergenos;

        // Filtrar campos undefined o vacíos antes de enviar
        const cleanUpdateData: any = {};
        Object.keys(updateData).forEach(key => {
          if (updateData[key] !== undefined && updateData[key] !== '') {
            cleanUpdateData[key] = updateData[key];
          }
        });

        console.log('Datos de actualización limpios:', cleanUpdateData);

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

      console.log('Creando categoría:', categoriaName, 'tipo:', tipo);

      // Crear la categoría usando la API
      this._categoriasService.create({
        nombre: categoriaName,
        descripcion: `Categoría ${categoriaName}`,
        tipo: tipo,
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
        activo: this.ingredienteActivo()
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
    if (confirm(`¿Estás seguro de que quieres eliminar el ingrediente "${ingrediente.nombre}"?`)) {
      this._ingredientesService.delete(ingrediente.ingrediente_id).subscribe({
        next: () => {
          alert(`Ingrediente "${ingrediente.nombre}" eliminado exitosamente.`);
          this.reloadTrigger$.next(this.reloadTrigger$.value + 1);
          this._cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al eliminar ingrediente:', error);
          alert('Error al eliminar el ingrediente. Inténtalo de nuevo.');
        }
      });
    }
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

    this.showAddIngredienteModal.set(true);
  }

  editPlato(plato: Plato) {
    // Establecer el ID del plato que estamos editando
    this.editingPlatoId.set(plato.plato_id);

    // Abrir modal de edición con los datos del plato (sin categoría)
    this.nombre.set(plato.nombre);
    this.descripcion.set(plato.descripcion || '');
    this.precio.set(plato.precio);
    this.disponible.set(plato.disponible);
    this.tiempo_preparacion_minutos.set(plato.tiempo_preparacion_minutos || 0);
    this.imagen_url.set(plato.imagen_url || '');
    this.alergenos.set(plato.alergenos || []);

    // Abrir el modal de edición
    this.showAddPlatoModal.set(true);
  }


  getPlatosByCategoria(): Record<string, Plato[]> {
    const platos = this.platosResource.value() || [];

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
      // Convertir la URI a un blob
      const response = await fetch(photo.webPath);
      const blob = await response.blob();

      // Crear un archivo desde el blob
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });

      // Subir la imagen al servidor
      const uploadResult = await this._platosService.uploadImage(file).toPromise();

      if (uploadResult) {
        this.imagen_url.set(uploadResult.imageUrl);

        // Si estamos editando un plato, actualizar inmediatamente la imagen en la base de datos
        if (this.editingPlatoId()) {
          this._platosService.update(this.editingPlatoId()!, { imagen_url: uploadResult.imageUrl }).subscribe({
            next: () => {
              // Recargar los platos para mostrar la nueva imagen
              this.reloadTrigger$.next(this.reloadTrigger$.value + 1);
              // Forzar la detección de cambios para actualizar la vista
              this._cdr.detectChanges();
            },
            error: (error) => {
              console.error('Error al actualizar imagen del plato:', error);
              alert('Error al actualizar la imagen del plato. Inténtalo de nuevo.');
            }
          });
        }
      }
    } catch (error) {
      console.error('Error al procesar la imagen:', error);
      alert('Error al subir la imagen. Inténtalo de nuevo.');
    }
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
    if (this.activeTab() === 'menu') {
      // Para el menú, usar las categorías de la base de datos
      const categoriasResourceValue = this.categoriasMenuResource.value();
      const categoriasFromDB = Array.isArray(categoriasResourceValue)
        ? categoriasResourceValue.map((c: any) => c.nombre)
        : [];
      return categoriasFromDB;
    } else {
      // Para inventario, usar las categorías de la base de datos
      const categoriasResourceValue = this.categoriasInventarioResource.value();
      const categoriasFromDB = Array.isArray(categoriasResourceValue)
        ? categoriasResourceValue.map((c: any) => c.nombre)
        : [];
      return categoriasFromDB;
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

}

export default AdminInventarioPageComponent;
