import {
  Component,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
  WritableSignal
} from '@angular/core';
import {element} from '../../../utils/animations';
import {TitleComponent} from '../title/title.component';
import {TableComponent} from '../../ui/table/table.component';
import {TableColumn} from '../../types/ui';
import {UserEntity} from '../../entities/user.entity';
import {UserRole, UserStatus} from '../../types/user';
import {BehaviorSubject, Subscription} from 'rxjs';
import {UserService} from '../../services/user.service';
import {AsyncPipe, NgIf} from '@angular/common';
import {DialogComponent} from '../../ui/dialog/dialog.component';
import {DialogService} from '../../services/dialog.service';
import {DomSanitizer} from '@angular/platform-browser';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {SpinnerComponent} from '../../ui/spinner/spinner.component';
import {isEmailRegex} from '../../../utils/constants';
import {delay} from '../../../utils/functions';

@Component({
  selector: 'app-users',
  imports: [
    TitleComponent,
    TableComponent,
    NgIf,
    AsyncPipe,
    DialogComponent,
    FormsModule,
    ReactiveFormsModule,
    SpinnerComponent
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
  animations: [element]
})
export class UsersComponent implements OnInit, OnDestroy {
  public displayedColumns: TableColumn<UserEntity>[] = [];

  public users$: BehaviorSubject<UserEntity[]> = new BehaviorSubject<UserEntity[]>([]);

  public originalUsers$: BehaviorSubject<UserEntity[]> = new BehaviorSubject<UserEntity[]>([]);

  private userRoot = 'devOXn7hHmPkFRAdnhzEh6XDu0z2';

  private userDev  = 'KMBis43ld7PLqBQVzqWTzVGeaV03';

  public $isUserUpdated: WritableSignal<boolean> = signal(false);

  public $userSelected: WritableSignal<Partial<UserEntity> | null> = signal(null);

  public $pendingUserForm: WritableSignal<boolean> = signal(false);

  public userForm: FormGroup;

  private userService = inject(UserService);

  private dialogService = inject(DialogService);

  private formBuilder = inject(FormBuilder);

  private subscriptions: Subscription[] = [];

  @ViewChild('userName', { static: true })
  public userName!: ElementRef;

  constructor(private sanitizer: DomSanitizer) {
    effect(() => {
      const $isOpen = this.dialogService.isOpen('userDetailsOrCreate');

      if ($isOpen()) {
        setTimeout(() => this.userName.nativeElement.focus(), 300);
      }
    });
  }

  ngOnInit() {
    this.initUserForm();
    this.initColumns();

    const user$ = this.userService._list().subscribe(usersList => {
      const usersEntity = usersList.map(user => new UserEntity(user));
      const usersWithoutRoot = usersEntity.filter(user => user.uid !== this.userRoot);

      const sortedUsers = [
        ...usersWithoutRoot.filter(user => user.uid === this.userDev),
        ...usersWithoutRoot.filter(user => user.uid !== this.userDev)
      ];

      this.users$.next(sortedUsers);
      this.originalUsers$.next(sortedUsers);
    });

    this.subscriptions.push(user$);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  public initUserForm() {
    this.userForm = this.formBuilder.group({
      lastname: ['', Validators.required],
      firstname: ['', Validators.required],
      email: ['', [Validators.required, Validators.pattern(isEmailRegex)]],
      role: [[], Validators.required],
    });
  }

  get initPassword() {
    const firstname = this.userForm.get('firstname').value;
    const lastname = this.userForm.get('lastname').value;

    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z]/g, '');

    return normalize(firstname) + normalize(lastname);
  }

  public cancelUserDetailsOrCreate() {
    this.dialogService.close('userDetailsOrCreate');
  }

  public async pendingForm() {
    this.userForm.get('lastname').disable();
    this.userForm.get('firstname').disable();
    this.userForm.get('email').disable();
    this.userForm.get('role').disable();

    this.$pendingUserForm.set(true);
    await delay(1000);
  }

  public async saveUserDetails() {
    const userForm = this.userForm.getRawValue() as Partial<UserEntity>;
    const rawRoleValue = this.userForm.value.role;

    if (this.$isUserUpdated() && this.$userSelected()) {
      const userSelected = this.$userSelected();

      if (this.userForm.dirty) {
        await this.pendingForm();

        await this.userService.update({
          uid: userSelected.uid,
          lastname: userForm.lastname ?? userSelected.lastname,
          firstname: userForm.firstname ?? userSelected.firstname,
          email: userForm.email ?? userSelected.email,
          role: userForm.role ?? userSelected.role,
        });
      }
    } else {
      const role: UserRole[] = rawRoleValue.split(',') as UserRole[];

      await this.pendingForm();

      await this.userService.create({
        lastname: userForm.lastname,
        firstname: userForm.firstname,
        email: userForm.email,
        role: role,
        badgeChat: 0,
        avatarID: userForm.lastname+userForm.firstname
      });
    }

    this.dialogService.close('userDetailsOrCreate');
    this.resetUserForm();
    this.$userSelected.set(null);
  }

  public resetUserForm() {
    this.$isUserUpdated.set(false);
    this.$pendingUserForm.set(false);
    this.userForm.get('lastname').enable();
    this.userForm.get('firstname').enable();
    this.userForm.get('email').enable();
    this.userForm.get('role').enable();
    this.userForm.markAsPristine();
    this.userForm.patchValue({
      lastname: '', firstname: '', email: '', role: []
    });
  }

  public async openDeleteUser() {
    await this.dialogService.open('confirmDeleteUser');
  }

  public async deleteUser() {
    const userSelected = this.$userSelected();

    this.$pendingUserForm.set(true);
    await delay(1000);

    await this.userService.delete(userSelected.uid);
    this.dialogService.close('confirmDeleteUser');
    this.dialogService.close('userDetailsOrCreate');
    this.$userSelected.set(null);
    this.$isUserUpdated.set(false);
    this.resetUserForm();
  }

  public cancelDeleteUser() {
    this.dialogService.close('confirmDeleteUser');
  }

  public initColumns() {
    this.displayedColumns = [
      {
        label: 'Nom',
        key: 'lastname',
        type: 'string',
        width: '280px',
        transformer: (data) => {
          return `${data.firstname.cap()} ${data.lastname.cap()}`;
        }
      },
      {
        label: 'Adresse e-mail',
        key: 'email',
        type: 'string'
      },
      {
        label: 'Rôle',
        key: 'role',
        type: 'string',
        transformer: (data) => {
          if (data.role.includes(UserRole.ADMIN)) {
            return 'Administrateur';
          } else {
            return 'Utilisateur';
          }
        }
      },
      {
        label: 'État',
        key: 'status',
        type: 'string',
        transformer: (data) => {
          const html =
            data.status === UserStatus.ACTIVE
              ? '<span class="bg-green-500 h-3 w-3 rounded-full inline-block mr-2"></span>Connecté'
              : '<span class="bg-red-500 h-3 w-3 rounded-full inline-block mr-2"></span>Déconnecté';

          return this.sanitizer.bypassSecurityTrustHtml(html);
        }
      },
      {
        label: 'Date de création',
        key: 'created',
        type: 'date',
        width: '180px'
      }
    ];
  }

  public filterUsers(event: Event) {
    const target = event.target as HTMLInputElement;
    const term = target.value.toLowerCase().trim();
    const [part1 = '', part2 = ''] = term.split(' ');

    const users = this.originalUsers$.getValue();

    const usersFiltered = users.filter(user => {
      const firstname = user.firstname.toLowerCase();
      const lastname = user.lastname.toLowerCase();

      return (
        (firstname.startsWith(part1) && lastname.startsWith(part2)) ||
        (lastname.startsWith(part1) && firstname.startsWith(part2))
      );
    });

    this.users$.next(term.length > 0 ? usersFiltered : users);
  }

  public async openUserDetails(user?: Partial<UserEntity>) {
    const isSameUser = user && this.userDev === user.uid;

    if (user) {
      this.$isUserUpdated.set(true);
      this.$userSelected.set(user);

      this.userForm.patchValue({
        lastname: user.lastname, firstname: user.firstname, email: user.email, role: user.role
      });
    } else {
      this.resetUserForm();
    }

    await this.dialogService.open(isSameUser ? 'support' : 'userDetailsOrCreate');
  }
}
