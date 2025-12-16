import { RolesService } from '@admin/services/roles.service';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { tap } from 'rxjs';
import {
  IsEmptyComponent,
  IsErrorComponent,
  IsLoadingComponent,
} from '@shared/components';
import { AdminRolesTableComponent } from './components';
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'admin-roles-page',
  imports: [
    CommonModule,
    RouterLink,
    IsEmptyComponent,
    IsErrorComponent,
    IsLoadingComponent,
    AdminRolesTableComponent,
  ],
  templateUrl: './admin-roles-page.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminRolesPageComponent {
  private _rolesService: RolesService = inject(RolesService);
  private _router: Router = inject(Router);

  rolesResource = rxResource({
    loader: () => this._rolesService.getAll(),
  });

  isForbidden(id: number): boolean {
    try {
      return this._rolesService.forbidenRoles().includes(id);
    } catch {
      return false;
    }
  }

  onEditRole(id: number): void {
    try {
      if (this.isForbidden(id)) {
        alert('Este rol es de sistema y no puede ser editado.');
        return;
      }
      this._router.navigate(['admin/roles/edit', id]);
    } catch (error) {
      console.error(error);
      alert('Error al intentar editar el rol.');
    }
  }

  onDeleteRole(id: number): void {
    try {
      if (this.isForbidden(id)) {
        alert('Este rol es de sistema y no puede ser eliminado.');
        return;
      }
      if (!confirm('¿Está seguro de eliminar este rol?')) return;

      this._rolesService
        .deleteById(id)
        .pipe(tap(() => this._rolesService.getAll().subscribe()))
        .subscribe({
          next: () => {
            // Mantener comportamiento consistente con la tabla
            location.reload();
          },
          error: (err) => {
            console.error(err);
            alert('Error al eliminar el rol, por favor intente de nuevo.');
          },
        });
    } catch (error) {
      console.error(error);
      alert('Error al eliminar el rol.');
    }
  }
}

export default AdminRolesPageComponent;
