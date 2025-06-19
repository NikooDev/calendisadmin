import {inject, Injectable, OnDestroy} from '@angular/core';
import {catchError, map, of, ReplaySubject, Subscription} from 'rxjs';
import {UserEntity} from '../entities/user.entity';
import {RestService} from './rest.service';
import {AuthService} from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserService extends RestService<UserEntity> implements OnDestroy {
  public user$ = new ReplaySubject<UserEntity | null>(1);

  private authService = inject(AuthService);

  private subscriptions: Subscription[] = [];

  constructor() {
    super('users');

    this.initUser();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  private initUser() {
    const user$ = this.authService.auth$.subscribe(user => {
      if (user) {
        this._get(user.uid).pipe(
          map(userData => new UserEntity(userData)),
          catchError(error => {
            console.error('Error getting user data', error);
            return of(null);
          })
        ).subscribe({
          next: (userData) => {
            this.user$.next(userData);
          },
          error: (error) => this.user$.error(error)
        });
      } else {
        this.user$.next(null);
      }
    });

    this.subscriptions.push(user$);
  }
}
