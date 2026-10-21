import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '@auth/services/auth.service';
import { firstValueFrom } from 'rxjs';

export const RootRedirectGuard: CanMatchFn = async () => {
  const authService: AuthService = inject(AuthService);
  const router: Router = inject(Router);

  const isAuthenticated = await firstValueFrom(authService.checkAuthStatus());

  if (!isAuthenticated) {
    return router.parseUrl('/auth/login');
  }

  // Redirigir según el rol del usuario si ya está autenticado
  const user = authService.user();
  const roleName = (user?.role?.name || '').toLowerCase();
  const isWaiter = user?.role_id === 3 || user?.role_id === 4 || roleName.includes('mesero') || roleName.includes('camarero');
  
  if (isWaiter) {
    return router.parseUrl('/waiter/mesas');
  }
  return router.parseUrl('/admin');
};

export default RootRedirectGuard;
