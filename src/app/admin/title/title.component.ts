import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {NgClass} from '@angular/common';

@Component({
  selector: 'app-title',
  imports: [
    NgClass
  ],
  templateUrl: './title.component.html',
  styleUrl: './title.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TitleComponent {
  @Input()
  public border: boolean = true;
}
