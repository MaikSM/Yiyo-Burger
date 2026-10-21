import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
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
  private _cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

  appName = computed<string>(() => environment.appName);
  showChat = signal(false);

  constructor() {
    // Ensure auth status is checked when navbar loads
    this._authService.checkAuthStatus().subscribe({
      next: (isAuthenticated) => {
        console.log('🔐 Navbar: Auth status checked:', isAuthenticated);
        console.log('📷 Navbar: User photo:', this._authService.user()?.photo);
        this._cdr.detectChanges();
      },
      error: (err) => console.error('Error checking auth status:', err),
    });
  }

  public authStatus = computed(() => this._authService.authStatus());
  public userName = computed(() => {
    const name = this._authService.user()?.name;
    return name === 'Administrator' ? 'Administracion' : name;
  });

  public userPhoto = computed(() => this._authService.user()?.photo);

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
    { path: '/private/profile', label: 'Perfíl', icon: 'fas fa-cogs' },
  ]);

  openChat() {
    this._router.navigate(['/chat']);
  }

  logout() {
    this._authService.logout();
    this._router.navigate(['/']);
  }

  getInitials(): string {
    const user = this._authService.user();
    if (!user) return '?';
    const firstName = user.name?.charAt(0) || '';
    const lastName = user.surname?.charAt(0) || '';
    return (firstName + lastName).toUpperCase() || '?';
  }
}

export default PrivateLayoutNavbarComponent;
