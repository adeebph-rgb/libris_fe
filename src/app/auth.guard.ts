import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);


  return toObservable(authService.isInitialized).pipe(
    filter(initialized => initialized),
    take(1),
    map(() => {
      if (authService.currentUser()) {
        return true;
      }
      return router.createUrlTree(['/login']);
    })
  );
};
