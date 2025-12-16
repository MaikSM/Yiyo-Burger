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

  if (status === 'authenticated' && user?.role_id === 1) {
    return true;
  }

  // 2) Si aún no está resuelto el estado (o no hay user), valida por red una sola vez
  const isAuthenticated = await firstValueFrom(authService.checkAuthStatus());
  const freshUser = authService.user();

  if (isAuthenticated && freshUser?.role_id === 1) {
    return true;
  }

  // 3) Bloquea navegación cuando no es admin
  router.navigateByUrl('/');
  return false;
};

export default IsAdminGuard;
