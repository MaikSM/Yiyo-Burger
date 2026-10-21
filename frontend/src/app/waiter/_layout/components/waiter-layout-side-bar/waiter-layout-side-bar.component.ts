import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@auth/services/auth.service';
import { iMenuItem } from '@shared/interfaces';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'waiter-layout-side-bar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './waiter-layout-side-bar.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaiterLayoutSideBarComponent implements OnInit, OnDestroy {
  public authService: AuthService = inject(AuthService);
  private _router: Router = inject(Router);

  currentTime = signal<Date>(new Date());
  private timeInterval?: number;

  menuItems = signal<iMenuItem[]>([
    { path: '/waiter/mesas', label: 'Mesas', icon: 'fas fa-chair' },
    { path: '/waiter/pedidos', label: 'Mis Pedidos', icon: 'fas fa-history' },
  ]);

  ngOnInit(): void {
    this.timeInterval = window.setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  logout(): void {
    try {
      if (confirm('¿Está seguro de que desea cerrar sesión?')) {
        this.authService.logout();
        this._router.navigate(['/auth/login']);
      }
    } catch (error) {
      console.error(error);
    }
  }
}

export default WaiterLayoutSideBarComponent;
