import { Component } from '@angular/core';
import {element} from '../../../utils/animations';
import {TitleComponent} from '../title/title.component';

@Component({
  selector: 'app-round',
  imports: [
    TitleComponent
  ],
  templateUrl: './round.component.html',
  styleUrl: './round.component.scss',
  animations: [element]
})
export class RoundComponent {

}
