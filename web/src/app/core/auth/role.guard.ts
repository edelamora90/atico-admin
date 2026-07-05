import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
} from '@angular/router';

import {
  AuthService,
  UserRole,
} from './auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const roles = (route.data?.['roles'] || []) as UserRole[];

  if (!roles.length || auth.hasAnyRole(roles)) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
