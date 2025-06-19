import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-spinner',
  imports: [
    NgIf
  ],
  templateUrl: './spinner.component.html',
  styleUrl: './spinner.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpinnerComponent {
	@Input({ required: true })
	public pending!: boolean;

  @Input()
  public classname: string = '';

	@Input()
	public color: string = '#000';

	@Input()
	public size: number = 50;

	@Input()
	public strokeWidth: number = 3;
}
