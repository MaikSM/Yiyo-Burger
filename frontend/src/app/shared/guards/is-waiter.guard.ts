import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '@auth/services/auth.service';
import { firstValueFrom } from 'rxjs';

export const IsWaiterGuard: CanMatchFn = async () => {
  const authService: AuthService = inject(AuthService);
  const router: Router = inject(Router);

  const isAuthenticated = await firstValueFrom(authService.checkAuthStatus());
  const user = authService.user();
  const roleName = (user?.role?.name || '').toLowerCase();
  const isWaiter = user?.role_id === 3 || user?.role_id === 4 || roleName.includes('mesero') || roleName.includes('camarero');

  if (isAuthenticated && isWaiter) {
    return true;
  }

  if (isAuthenticated) {
    const isAdminOrCajero = user?.role_id === 1 || roleName === 'admin' || roleName === 'cajero';
    if (isAdminOrCajero) return router.parseUrl('/admin');
    return router.parseUrl('/auth/login');
  }

  return router.parseUrl('/auth/login');
};

export default IsWaiterGuard;
