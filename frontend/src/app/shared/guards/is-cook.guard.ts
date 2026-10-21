import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '@auth/services/auth.service';
import { firstValueFrom } from 'rxjs';

export const IsCookGuard: CanMatchFn = async () =>
  // route: Route,
  // segments: UrlSegment[],
  {
    const authService: AuthService = inject(AuthService);
    const router: Router = inject(Router);

    const isAuthenticated = await firstValueFrom(authService.checkAuthStatus());
    const userRoleId = authService.user()?.role_id;
    if (isAuthenticated && userRoleId === 5) return true;

    // Redirect to role-specific page instead of '/' to avoid redirect loop
    if (isAuthenticated) {
      if (userRoleId === 1) return router.parseUrl('/admin');
      if (userRoleId === 4) return router.parseUrl('/waiter');
      return router.parseUrl('/admin');
    }
    return router.parseUrl('/auth/login');
  };

export default IsCookGuard;