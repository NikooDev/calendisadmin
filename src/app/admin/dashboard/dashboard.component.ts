import { Component } from '@angular/core';
import {element} from '../../../utils/animations';
import {TitleComponent} from '../title/title.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    TitleComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  animations: [element]
})
export class DashboardComponent {

}
