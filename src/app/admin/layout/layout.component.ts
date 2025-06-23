import {
  Component,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  signal,
  ViewChild,
  WritableSignal
} from '@angular/core';
import {RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {AsyncPipe, NgClass, NgIf} from '@angular/common';
import {animate, state, style, transition, trigger} from '@angular/animations';
import {AuthService} from '../../services/auth.service';
import {ToastHostComponent} from '../../ui/toast/toast-host/toast-host.component';
import {UserService} from '../../services/user.service';
import {Subscription} from 'rxjs';
import {initialName} from '../../../utils/functions';
import {DialogComponent} from '../../ui/dialog/dialog.component';
import {DialogService} from '../../services/dialog.service';

@Component({
  selector: 'app-layout-private',
  imports: [
    RouterOutlet,
    NgClass,
    RouterLink,
    RouterLinkActive,
    NgIf,
    ToastHostComponent,
    AsyncPipe,
    DialogComponent
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
  animations: [
    trigger('slideInOut', [
      state('open', style({ transform: 'translateX(0)' })),
      state('closed', style({ transform: 'translateX(-110%)' })),
      transition('closed => open', [
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)')
      ]),
      transition('open => closed', [
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)')
      ]),
    ])
  ]
})
export class LayoutPrivateComponent implements OnInit {
  public $isSidebarOpen: WritableSignal<boolean> = signal(true);

  public isDesktop = window.innerWidth >= 1024;

  private authService = inject(AuthService);

  private userService = inject(UserService);

  private dialogService = inject(DialogService);

  private subscriptions: Subscription[] = [];

  protected readonly linkClass = 'flex items-center hover:shadow-md space-x-4 text-slate-800 hover:bg-theme-500 hover:text-white py-2 px-3 rounded-lg transitions-all duration-200 select-none';

  @ViewChild('toggleBtn') toggleBtnRef!: ElementRef<HTMLElement>;
  @ViewChild('sidebar') sidebarRef!: ElementRef<HTMLElement>;

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.isDesktop = event.target.innerWidth >= 1024;
    this.$isSidebarOpen.set(this.isDesktop);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (!this.isDesktop && this.$isSidebarOpen()) {
      const clickedInsideSidebar = this.sidebarRef.nativeElement.contains(event.target as Node);
      const clickedOnToggleBtn = this.toggleBtnRef.nativeElement.contains(event.target as Node);

      if (!clickedInsideSidebar && !clickedOnToggleBtn) {
        this.$isSidebarOpen.set(false);
      }
    }
  }

  ngOnInit() {
    this.$isSidebarOpen.set(this.isDesktop);
  }

  get user$() {
    return this.userService.user$;
  }

  get layoutClasses() {
    return this.$isSidebarOpen() && this.isDesktop ? 'pl-72' : '';
  }

  public toggleSidebar() {
    if (this.isDesktop) {
      return;
    }

    this.$isSidebarOpen.set(!this.$isSidebarOpen());
  }

  public async logout() {
    await this.authService.logout();
  }

  public async openSupport() {
    await this.dialogService.open('support');
  }

  public closeSupport() {
    this.dialogService.close('support');
  }

  protected readonly initialName = initialName;
}
