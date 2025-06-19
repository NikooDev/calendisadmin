import { Component } from '@angular/core';
import {ToastHostComponent} from '../ui/toast/toast-host/toast-host.component';
import {RouterOutlet} from '@angular/router';

@Component({
  selector: 'app-layout-public',
  imports: [
    ToastHostComponent,
    RouterOutlet
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutPublicComponent {

}
