import { UsersService } from '@admin/services/users.service';
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
import { AdminUsersTableComponent } from './components/table/admin-users-table.component';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'admin-users-page',
  imports: [
    CommonModule,
    RouterLink,
    IsEmptyComponent,
    IsErrorComponent,
    IsLoadingComponent,
    AdminUsersTableComponent,
  ],
  templateUrl: './admin-users-page.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersPageComponent {
  private _usersService: UsersService = inject(UsersService);
  private _router: Router = inject(Router);

  usersResource = rxResource({
    loader: () => this._usersService.getAll(),
  });

  isForbidden(id: number): boolean {
    try {
      return this._usersService.forbidenUsers().includes(id);
    } catch {
      return false;
    }
  }

  onEditUser(id: number): void {
    try {
      if (this.isForbidden(id)) {
        alert('Este usuario es de sistema y no puede ser editado.');
        return;
      }
      this._router.navigate(['admin/users/edit', id]);
    } catch (error) {
      console.error(error);
      alert('Error al intentar editar el usuario.');
    }
  }

  onDeleteUser(id: number): void {
    try {
      if (this.isForbidden(id)) {
        alert('Este usuario es de sistema y no puede ser eliminado.');
        return;
      }
      if (!confirm('¿Está seguro de eliminar este usuario?')) return;

      this._usersService
        .deleteById(id)
        .pipe(tap(() => this._usersService.getAll().subscribe()))
        .subscribe({
          next: () => {
            // Mantener comportamiento consistente con la tabla
            location.reload();
          },
          error: (err) => {
            console.error(err);
            alert('Error al eliminar el usuario, por favor intente de nuevo.');
          },
        });
    } catch (error) {
      console.error(error);
      alert('Error al eliminar el usuario.');
    }
  }

  onGenerateQR(id: number, name: string): void {
    try {
      const qrData = `user-id:${id}`;
      // Abrir una nueva ventana con el QR
      const qrWindow = window.open('', '_blank', 'width=800,height=900');
      if (qrWindow) {
        qrWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Código QR - Usuario ${name}</title>
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
                <p><strong>Usuario:</strong> ${name}</p>
                <p><strong>ID:</strong> ${id}</p>
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
        alert('Error al abrir la ventana del QR. Por favor, permita las ventanas emergentes para este sitio.');
      }
    } catch (error) {
      console.error(error);
      alert('Error al generar el código QR, por favor intente de nuevo.');
    }
  }
}

export default AdminUsersPageComponent;
