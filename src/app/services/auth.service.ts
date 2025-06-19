import {inject, Injectable, OnDestroy} from '@angular/core';
import {
  Auth, User,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateEmail,
  updatePassword
} from '@angular/fire/auth';
import {HttpClient} from '@angular/common/http';
import {Observable, of, ReplaySubject, Subscription, switchMap} from 'rxjs';
import {Router} from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  private auth = inject(Auth);

  public auth$ = new ReplaySubject<User | null>(1);

  private httpClient = inject(HttpClient);

  private router = inject(Router);

  private readonly dbName = 'firebaseLocalStorageDb';

  private readonly storeName = 'firebaseLocalStorage';

  private subscriptions: Subscription[] = [];

  constructor() {
    this.initAuth();
    this.initCheckUser();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  public initAuth() {
    this.auth.onAuthStateChanged(user => {
      if (user) {
       this.auth$.next(user);
      } else {
        this.auth$.next(null);
      }
    });
  }

  private initCheckUser() {
    const auth$ = this.auth$.pipe(
      switchMap(user => {
        if (user) {
          return this.checkUser();
        } else {
          this.logout().then();
          this.router.navigate(['/admin/login']).then();
          return of(null);
        }
      })
    ).subscribe(result => {
      if (result === false) {
        this.auth$.next(null);
      }
    });

    this.subscriptions.push(auth$);
  }

  private checkUser(): Observable<boolean> {
    return new Observable<boolean>((observer) => {
      const request = indexedDB.open(this.dbName);

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const getRequest = store.getAll();

        getRequest.onsuccess = () => {
          const data = getRequest.result;
          observer.next(data.length > 0);
          observer.complete();
        };

        getRequest.onerror = () => {
          observer.next(false);
          observer.complete();
        };
      };

      request.onerror = () => {
        console.error('Erreur lors de l\'ouverture d\'IndexedDB');
        observer.next(false);
        observer.complete();
      };
    });
  }

  public signIn(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  public async updateEmail(oldEmail: string, newEmail: string, password: string): Promise<void> {
    await this.signIn(oldEmail, password);

    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      console.error('No user logged in');
      return;
    }

    return await updateEmail(currentUser, newEmail);
  }

  public async missingPassword(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email);
  }

  public async updatePassword(email: string, oldPassword: string, newPassword: string): Promise<void> {
    await this.signIn(email, oldPassword);

    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      console.error('No user logged in');
      return;
    }

    return updatePassword(currentUser, newPassword);
  }

  public async logout(): Promise<void> {
    await this.auth.signOut();
  }
}
