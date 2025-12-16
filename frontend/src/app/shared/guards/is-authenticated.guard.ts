import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '@auth/services/auth.service';
import { firstValueFrom } from 'rxjs';

export const IsAuthenticatedGuard: CanMatchFn = async (route, segments) => {
    const authService: AuthService = inject(AuthService);
    const router: Router = inject(Router);

    const isAuthenticated = await firstValueFrom(authService.checkAuthStatus());

    if (isAuthenticated) return true;

    // Redirigir al login con el returnUrl
    const returnUrl = segments.map(segment => segment.path).join('/');
    router.navigate(['/auth/login'], {
      queryParams: { returnUrl: `/${returnUrl}` }
    });

    return false;
  };

export default IsAuthenticatedGuard;
