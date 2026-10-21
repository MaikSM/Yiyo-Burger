import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '@auth/services/auth.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil.component.html',
})
export class PerfilComponent implements OnInit {
  public authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    console.log('👨‍🍳 Perfil del mesero cargado correctamente');
  }

  logout() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      this.authService.logout();
      this.router.navigate(['/auth/login']);
    }
  }
}

export default PerfilComponent;
