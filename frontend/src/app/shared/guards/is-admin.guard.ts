import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '@auth/services/auth.service';
import { firstValueFrom, of } from 'rxjs';

export const IsAdminGuard: CanMatchFn = async () => {
  const authService: AuthService = inject(AuthService);
  const router: Router = inject(Router);

  // 1) Si ya tenemos usuario y rol en memoria y está autenticado, evita llamada extra
  const user = authService.user();
  const status = authService.authStatus();

  const roleName = (user?.role?.name || '').toLowerCase();
  if (status === 'authenticated' && (user?.role_id === 1 || roleName === 'admin' || roleName === 'cajero')) {
    return true;
  }

  // 2) Si aún no está resuelto el estado (o no hay user), valida por red una sola vez
  const isAuthenticated = await firstValueFrom(authService.checkAuthStatus());
  const freshUser = authService.user();
  const freshRoleName = (freshUser?.role?.name || '').toLowerCase();

  if (isAuthenticated && (freshUser?.role_id === 1 || freshRoleName === 'admin' || freshRoleName === 'cajero')) {
    return true;
  }

  // 3) Bloquea navegación cuando no es admin - redirect to role-specific page
  if (isAuthenticated && freshUser) {
    const isWaiter = freshUser.role_id === 3 || freshUser.role_id === 4 || freshRoleName.includes('mesero') || freshRoleName.includes('camarero');
    if (isWaiter) return router.parseUrl('/waiter/mesas');
    if (freshUser.role_id === 5 || freshRoleName.includes('cocinero')) return router.parseUrl('/cook');
    return router.parseUrl('/auth/login');
  }

  return router.parseUrl('/auth/login');
};

export default IsAdminGuard;
