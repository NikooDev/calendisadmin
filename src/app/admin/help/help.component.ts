import { Component } from '@angular/core';
import {element} from '../../../utils/animations';
import {TitleComponent} from '../title/title.component';

@Component({
  selector: 'app-help',
  imports: [
    TitleComponent
  ],
  templateUrl: './help.component.html',
  styleUrl: './help.component.scss',
  animations: [element]
})
export class HelpComponent {

}
