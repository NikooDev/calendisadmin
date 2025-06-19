import { Component } from '@angular/core';
import {element} from '../../../utils/animations';
import {TitleComponent} from '../title/title.component';

@Component({
  selector: 'app-history',
  imports: [
    TitleComponent
  ],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
  animations: [element]
})
export class HistoryComponent {

}
