import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { PlatosService, Plato } from '@admin/services/platos.service';
import { IsErrorComponent, IsLoadingComponent } from '@shared/components';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'admin-platos-especiales-page',
  standalone: true,
  imports: [CommonModule, IsErrorComponent, IsLoadingComponent],
  templateUrl: './admin-platos-especiales-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPlatosEspecialesPageComponent implements OnInit {
  private _platosService = inject(PlatosService);
  private _cdr = inject(ChangeDetectorRef);
  private reloadTrigger$ = new BehaviorSubject(0);

  platosEspecialesResource = rxResource({
    request: () => this.reloadTrigger$.value,
    loader: () => this._platosService.getAll(),
  });

  get platosEspeciales(): Plato[] {
    const allPlatos = this.platosEspecialesResource.value() || [];
    return allPlatos.filter(plato => plato.es_especial);
  }

  ngOnInit() {
    // Escuchar cambios para recargar si es necesario
  }

  toggleEspecial(plato: Plato, event: Event) {
    event.stopPropagation();
    const newStatus = !plato.es_especial;
    this._platosService.update(plato.plato_id, { es_especial: newStatus }).subscribe({
      next: () => {
        this.reloadTrigger$.next(this.reloadTrigger$.value + 1);
        this._cdr.detectChanges();
      },
      error: (err) => console.error('Error al actualizar plato especial:', err)
    });
  }

  toggleDisponibilidad(plato: Plato, event: Event) {
    event.stopPropagation();
    const newStatus = !plato.disponible;
    this._platosService.update(plato.plato_id, { disponible: newStatus }).subscribe({
      next: () => {
        this.reloadTrigger$.next(this.reloadTrigger$.value + 1);
        this._cdr.detectChanges();
      },
      error: (err) => console.error('Error al actualizar disponibilidad:', err)
    });
  }
}

export default AdminPlatosEspecialesPageComponent;
