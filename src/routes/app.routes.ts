import { Routes } from '@angular/router';
import {HomeComponent} from '../app/home/home.component';
import {adminGuard} from '../app/guards/admin.guard';
import {DashboardComponent} from '../app/admin/dashboard/dashboard.component';
import {LoginComponent} from '../app/admin/login/login.component';
import {loginGuard} from '../app/guards/login.guard';
import {LayoutPrivateComponent} from '../app/admin/layout/layout.component';
import {LayoutPublicComponent} from '../app/layout/layout.component';
import {RoundComponent} from '../app/admin/round/round.component';
import {SectorsComponent} from '../app/admin/sectors/sectors.component';
import {DonationsComponent} from '../app/admin/donations/donations.component';
import {UsersComponent} from '../app/admin/users/users.component';
import {ChatComponent} from '../app/admin/chat/chat.component';
import {HistoryComponent} from '../app/admin/history/history.component';
import {HelpComponent} from '../app/admin/help/help.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutPublicComponent,
    children: [
      {
        path: '',
        component: HomeComponent
      },
      {
        path: 'admin/login',
        canActivate: [loginGuard],
        component: LoginComponent
      }
    ]
  },
  {
    path: 'admin',
    component: LayoutPrivateComponent,
    canActivateChild: [adminGuard],
    children: [
      {
        path: '',
        component: DashboardComponent
      },
      {
        path: 'round',
        component: RoundComponent
      },
      {
        path: 'sectors',
        component: SectorsComponent
      },
      {
        path: 'donations',
        component: DonationsComponent
      },
      {
        path: 'users',
        component: UsersComponent
      },
      {
        path: 'chat',
        component: ChatComponent
      },
      {
        path: 'history',
        component: HistoryComponent
      },
      {
        path: 'help',
        component: HelpComponent
      }
    ]
  }
];
