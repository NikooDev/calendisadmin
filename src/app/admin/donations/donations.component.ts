import { Component } from '@angular/core';
import {element} from '../../../utils/animations';
import {TitleComponent} from '../title/title.component';

@Component({
  selector: 'app-donations',
  imports: [
    TitleComponent
  ],
  templateUrl: './donations.component.html',
  styleUrl: './donations.component.scss',
  animations: [element]
})
export class DonationsComponent {

}
