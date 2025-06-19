import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-switch',
  imports: [],
  templateUrl: './switch.component.html',
  styleUrl: './switch.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SwitchComponent {
	@Input({ required: true })
	public isChecked: boolean = false;

	@Output()
	public change = new EventEmitter<boolean>();

	toggle() {
		this.isChecked = !this.isChecked;
		this.change.emit(this.isChecked);
	}
}
