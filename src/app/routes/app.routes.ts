import { Routes } from '@angular/router';
import {HomeComponent} from '../home/home.component';
import {adminGuard} from '../guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'admin',
    canActivateChild: [adminGuard],
    children: [

    ]
  }
];
