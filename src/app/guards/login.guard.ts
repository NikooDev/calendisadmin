import {CanActivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {AuthService} from '../services/auth.service';
import {map, take} from 'rxjs';

export const loginGuard: CanActivateFn = (childRoute, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return authService.auth$.pipe(
    take(1),
    map(user => {
      if (!user) {
        return true;
      } else {
        router.navigate(['/admin']).then();
        return false;
      }
    })
  );
};
