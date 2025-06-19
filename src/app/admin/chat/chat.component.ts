import { Component } from '@angular/core';
import {element} from '../../../utils/animations';
import {TitleComponent} from '../title/title.component';

@Component({
  selector: 'app-chat',
  imports: [
    TitleComponent
  ],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
  animations: [element]
})
export class ChatComponent {

}
