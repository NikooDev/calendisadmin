import { Component } from '@angular/core';
import {element} from '../../../utils/animations';
import {TitleComponent} from '../title/title.component';

@Component({
  selector: 'app-users',
  imports: [
    TitleComponent
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
  animations: [element]
})
export class UsersComponent {

}
