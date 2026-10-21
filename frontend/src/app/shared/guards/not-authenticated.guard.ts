import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '@auth/services/auth.service';
import { firstValueFrom } from 'rxjs';

export const NotAuthenticatedGuard: CanMatchFn = async () =>
  // route: Route,
  // segments: UrlSegment[],
  {
    const authService: AuthService = inject(AuthService);
    const router: Router = inject(Router);

    const isAuthenticated = await firstValueFrom(authService.checkAuthStatus());

    if (isAuthenticated) {
      // Redirect to role-specific page instead of '/' to avoid redirect loop
      const user = authService.user();
      const roleName = (user?.role?.name || '').toLowerCase();
      const isWaiter =
        user?.role_id === 3 ||
        user?.role_id === 4 ||
        roleName.includes('mesero') ||
        roleName.includes('camarero');

      if (isWaiter) {
        return router.parseUrl('/waiter/mesas');
      } else if (user?.role_id === 5 || roleName.includes('cocinero')) {
        return router.parseUrl('/cook');
      }
      return router.parseUrl('/admin');
    }

    //   console.log({isAuthenticated});
    return true;
  };

export default NotAuthenticatedGuard;
