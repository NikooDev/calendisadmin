import {Component, ElementRef, inject, OnInit, signal, ViewChild, WritableSignal} from '@angular/core';
import {CardComponent} from '../../ui/card/card.component';
import {NgIf, NgOptimizedImage} from '@angular/common';
import {element, element300} from '../../../utils/animations';
import {AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {SpinnerComponent} from '../../ui/spinner/spinner.component';
import {ToastService} from '../../services/toast.service';
import {ToastTypeEnum} from '../../types/ui';
import {isEmailRegex} from '../../../utils/constants';
import {AuthService} from '../../services/auth.service';
import {FirebaseError} from '@firebase/util'
import {Router} from '@angular/router';
import {catchError} from '../../handlers/message';
import {delay} from '../../../utils/functions';
import {UserService} from '../../services/user.service';
import {UserStatus} from '../../types/user';

@Component({
  selector: 'app-login',
  imports: [
    CardComponent,
    NgOptimizedImage,
    FormsModule,
    ReactiveFormsModule,
    NgIf,
    SpinnerComponent
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  animations: [element, element300]
})
export class LoginComponent implements OnInit {
  public authForm!: FormGroup;

  private authService = inject(AuthService);

  private formBuilder = inject(FormBuilder);

  private router = inject(Router);

  private toastService = inject(ToastService);

  private userService = inject(UserService);

  public $pending: WritableSignal<boolean> = signal(false);

  @ViewChild('emailInput') emailInput!: ElementRef;

  ngOnInit() {
    this.initForm();
  }

  public initForm() {
    this.authForm = this.formBuilder.group({
      email: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  public onFocus() {
    this.emailInput.nativeElement.focus();
  }

  public async submit() {
    const email = this.authForm.get('email') as AbstractControl<string, string>;
    const password = this.authForm.get('password') as AbstractControl<string, string>;

    if (!email.value || !password.value) {
      this.toastService.open(ToastTypeEnum.ERROR, 'Tous les champs sont requis.', undefined, { unique: true });
      return;
    }

    if (email.value && !isEmailRegex.test(email.value)) {
      this.toastService.open(ToastTypeEnum.ERROR, 'Votre adresse e-mail est incorrecte.', undefined, { unique: true });
      return;
    }

    this.$pending.set(true);
    email.disable();
    password.disable();

    await delay(3000);

    try {
      const userCredential = await this.authService.signIn(email.value, password.value);
      await this.userService.update({ uid: userCredential.user.uid, status: UserStatus.ACTIVE });

      await this.router.navigate(['/admin']);
    } catch (error) {
      console.error(error);

      if (error instanceof FirebaseError) {
        const messageError = catchError(error.code);

        this.toastService.open(ToastTypeEnum.ERROR, messageError, undefined, { unique: true });
      }

      this.$pending.set(false);
      email.enable();
      password.enable();
    }
  }
}
