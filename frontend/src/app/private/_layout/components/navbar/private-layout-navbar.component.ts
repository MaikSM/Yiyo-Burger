import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@auth/services/auth.service';
import { environment } from '@env/environment';
import { iMenuItem } from '@shared/interfaces/menu-item.interface';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'private-layout-navbar',
  imports: [RouterLink],
  templateUrl: './private-layout-navbar.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivateLayoutNavbarComponent {
  private _authService: AuthService = inject(AuthService);
  private _router: Router = inject(Router);

  appName = computed<string>(() => environment.appName);
  showChat = signal(false);

  public authStatus = computed(() => this._authService.authStatus());
  public userName = computed(() => {
    const name = this._authService.user()?.name;
    return name === 'Administrator' ? 'Administracion' : name;
  });

  public displayName = computed(() => {
    const user = this._authService.user();
    if (!user || !user.role) return this.userName();

    const roleName = user.role.name.toLowerCase();
    return roleName === 'mesero' ? 'Panel de Mesero' : this.userName();
  });

  public isAdmin = computed(() => {
    if (this._authService.user()?.role?.id === 1) return true;
    return false;
  });

  menuItems = signal<iMenuItem[]>([
    { path: '/', label: 'Home', icon: 'fas fa-home' },
    { path: '/perfil', label: 'Perfíl', icon: 'fas fa-cogs' },
  ]);

  openChat() {
    this._router.navigate(['/chat']);
  }

  logout() {
    this._authService.logout();
    this._router.navigate(['/']);
  }
}

export default PrivateLayoutNavbarComponent;
