import { UsersService } from '@admin/services/users.service';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { iUser } from '@auth/interfaces';
import {
  Column,
  ColumnFiltersState,
  createAngularTable,
  FlexRenderDirective,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  Row,
  SortingState,
  VisibilityState,
} from '@tanstack/angular-table';
import usersTableColumns from './users-table-columns.definition';
import { toast } from 'ngx-sonner';
import { tap } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'admin-users-table',
  imports: [CommonModule, FlexRenderDirective],
  templateUrl: './admin-users-table.component.html',
  styles: `
    :host {
      /* Forzar que se apliquen los estilos de TailwindCSS sobre DaisyUI */
      table {
        background-color: rgb(31 41 55) !important;
        border-radius: 0.5rem !important;
        overflow: hidden !important;
      }

      table thead tr {
        background-color: rgb(55 65 81) !important;
        color: rgb(251 146 60) !important;
      }

      table tbody tr {
        background-color: white !important;
        color: rgb(17 24 39) !important;
        border-bottom: 1px solid rgb(75 85 99) !important;
      }

      table tbody tr:hover {
        background-color: white !important;
      }

      table th,
      table td {
        padding: 0.75rem 1rem !important;
        text-align: left !important;
      }

      /* Sobrescribir estilos de DaisyUI para inputs */
      input {
        background-color: rgb(55 65 81) !important;
        border-color: rgb(75 85 99) !important;
        color: rgb(243 244 246) !important;
      }

      input:focus {
        outline: none !important;
        border-color: rgb(251 146 60) !important;
        box-shadow: 0 0 0 2px rgb(251 146 60 / 0.2) !important;
      }

      /* Sobrescribir estilos de DaisyUI para botones */
      button {
        border-radius: 0.375rem !important;
        transition: all 0.2s !important;
      }

      /* Sobrescribir estilos de DaisyUI para select */
      select {
        background-color: rgb(55 65 81) !important;
        border-color: rgb(75 85 99) !important;
        color: rgb(243 244 246) !important;
      }

      select:focus {
        outline: none !important;
        border-color: rgb(251 146 60) !important;
        box-shadow: 0 0 0 2px rgb(251 146 60 / 0.2) !important;
      }

      /* Sobrescribir estilos de DaisyUI para badges */
      .badge {
        background-color: initial !important;
        color: initial !important;
        border-radius: 9999px !important;
        padding: 0.25rem 0.5rem !important;
        font-size: 0.75rem !important;
        font-weight: 600 !important;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersTableComponent {
  //
  private _usersService: UsersService = inject(UsersService);
  private _router: Router = inject(Router);
  users = input.required<iUser[]>();

  /*  */

  private readonly _pagination = signal<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  public readonly sizesPages = signal<number[]>([1, 3, 5, 10, 20]); // This is the page size that will be passed to the table
  private readonly _sortingState = signal<SortingState>([]); // This is the sorting state that will be passed to the table
  private readonly _columnVisibility = signal<VisibilityState>({}); // This is the column visibility state that will be passed to the table
  private readonly _columnFilter = signal<ColumnFiltersState>([]); // This is the column filter state that will be passed to the table

  public table = createAngularTable(() => ({
    data: this.users(),
    getCoreRowModel: getCoreRowModel(),
    columns: usersTableColumns,
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
    state: {
      pagination: this._pagination(),
      sorting: this._sortingState(),
      columnVisibility: this._columnVisibility(),
      columnFilters: this._columnFilter(),
    },
    onPaginationChange: (valueOrFunction) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      typeof valueOrFunction === 'function'
        ? this._pagination.update(valueOrFunction)
        : this._pagination.set(valueOrFunction);
    },
    onSortingChange: (valueOrFunction) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      typeof valueOrFunction === 'function'
        ? this._sortingState.update(valueOrFunction)
        : this._sortingState.set(valueOrFunction);
    },
    onColumnVisibilityChange: (valueOrFunction) => {
      const visibilityStatechange =
        valueOrFunction instanceof Function
          ? valueOrFunction(this._columnVisibility())
          : valueOrFunction;
      this._columnVisibility.set(visibilityStatechange);
    },
    onColumnFiltersChange: (filterChange) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      filterChange instanceof Function
        ? this._columnFilter.update(filterChange)
        : this._columnFilter.set(filterChange);
    },
  }));

  /* Metodos */
  onChangePageSize(e: Event) {
    try {
      const element = e.target as HTMLSelectElement;
      this.table.setPageSize(Number(element.value));
    } catch (error) {
      console.error(error);
    }
  }

  onSort(col: Column<iUser>) {
    try {
      col.toggleSorting(col.getIsSorted() === 'asc');
    } catch (error) {
      console.error(error);
    }
  }

  onSearch(value: string) {
    try {
      const allColumnsIds = this.table
        .getAllColumns()
        .map((col) => col.id)
        .filter((id) => id !== 'select' && id !== 'actions');

      // console.log('allColumns', allColumnsIds);
      allColumnsIds.forEach((colId) => {
        this.table.getColumn(colId)?.setFilterValue(value);
      });
    } catch (error) {
      console.error(error);
    }
  }

  onEdit(row: Row<iUser>) {
    try {
      if (this._usersService.forbidenUsers().includes(row.original.id!)) {
        toast.error('Éste Usuario, No Puede ser Editado', {
          description:
            'Este usuario es un usuario de sistema y no puede ser editado',
        });
        return;
      }
      this._router.navigate(['admin/users/edit', row.original.id]);
    } catch (error) {
      console.error(error);
      toast.error('Error al Editar el Usuario', {
        description: 'Error al Editar el Usuario, por favor intente de nuevo',
      });
    }
  }

  onDelete(row: Row<iUser>) {
    try {
      if (this._usersService.forbidenUsers().includes(row.original.id!)) {
        toast.error('Éste Usuario, No Puede ser Eliminado', {
          description:
            'Este usuario es un usuario de sistema y no puede ser eliminado',
        });
        return;
      }
      if (confirm('¿Está Seguro de Eliminar Éste Registro?')) {
        this._usersService
          .deleteById(row.original.id!)
          .pipe(tap(() => this._usersService.getAll().subscribe()))
          .subscribe({
            next: () => {
              toast.success('Registro Eliminado', {
                description: 'El Registro ha sido eliminado correctamente',
              });
              location.reload();
            },
            error: (err) => {
              console.error(err);
              toast.error('Error al Eliminar el Registro', {
                description:
                  'Error al Eliminar el Registro, por favor intente de nuevo',
              });
            },
          });
      }
    } catch (error) {
      console.error(error);

      toast.error('Error al Eliminar el Usuario', {
        description: 'Error al Eliminar el Usuario, por favor intente de nuevo',
      });
    }
  }

  onGenerateQR(row: Row<iUser>) {
    try {
      const qrData = `user-id:${row.original.id}`;
      // Abrir una nueva ventana con el QR
      const qrWindow = window.open('', '_blank', 'width=800,height=900');
      if (qrWindow) {
        qrWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Código QR - Usuario ${row.original.name} ${row.original.surname}</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  text-align: center;
                  padding: 20px;
                  background-color: #f5f5f5;
                  margin: 0;
                }
                h1 {
                  color: #333;
                  margin-bottom: 10px;
                }
                .user-info {
                  margin-bottom: 20px;
                  font-size: 16px;
                }
                .qr-container {
                  width: 400px;
                  height: 400px;
                  margin: 20px auto;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border: 2px solid #ddd;
                  background-color: white;
                  border-radius: 8px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .print-btn {
                  margin-top: 20px;
                  padding: 12px 24px;
                  background-color: #007bff;
                  color: white;
                  border: none;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 16px;
                  transition: background-color 0.3s;
                }
                .print-btn:hover {
                  background-color: #0056b3;
                }
              </style>
            </head>
            <body>
              <h1>Código QR de Usuario</h1>
              <div class="user-info">
                <p><strong>Usuario:</strong> ${row.original.name} ${row.original.surname}</p>
                <p><strong>ID:</strong> ${row.original.id}</p>
              </div>
              <div class="qr-container">
                <div id="loading">Generando QR...</div>
                <canvas id="qrcode" style="display: none;"></canvas>
              </div>
              <button class="print-btn" onclick="window.print()">Imprimir QR</button>
              <!-- QRCode library -->
              <script>
                // Función simple para generar QR usando API de QR Server con datos de texto plano
                function generateQR() {
                  try {
                    const loading = document.getElementById('loading');
                    const qrContainer = document.querySelector('.qr-container');

                    console.log('Generating QR using QR Server API for:', '${qrData}');

                    // Crear imagen usando QR Server API con parámetros optimizados
                    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=256x256&ecc=M&format=png&qzone=2&data=${encodeURIComponent(qrData)}';
                    const img = document.createElement('img');
                    img.src = qrUrl;
                    img.style.width = '256px';
                    img.style.height = '256px';
                    img.style.display = 'block';
                    img.style.margin = '0 auto';
                    img.onload = function() {
                      console.log('QR code generated successfully using QR Server!');
                      console.log('QR URL:', qrUrl);
                      loading.style.display = 'none';
                      qrContainer.innerHTML = '';
                      qrContainer.appendChild(img);
                    };
                    img.onerror = function() {
                      console.error('Error loading QR from QR Server');
                      qrContainer.innerHTML = '<p style="color: red;">Error al generar el código QR</p>';
                    };

                    // Mostrar loading mientras carga
                    qrContainer.innerHTML = '<div id="loading">Generando QR...</div>';
                    qrContainer.appendChild(img);

                  } catch (error) {
                    console.error('Error generando QR:', error);
                    document.querySelector('.qr-container').innerHTML = '<p style="color: red;">Error al generar el código QR</p>';
                  }
                }

                // Generar QR inmediatamente
                generateQR();
              </script>
            </body>
          </html>
        `);
        qrWindow.document.close();
      } else {
        toast.error('Error al abrir la ventana del QR', {
          description: 'Por favor, permita las ventanas emergentes para este sitio.',
        });
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al generar el QR', {
        description: 'Error al generar el código QR, por favor intente de nuevo',
      });
    }
  }
}

export default AdminUsersTableComponent;
