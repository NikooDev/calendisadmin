import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { Primitive, TableAction, TableColumn } from '../../types/ui';
import { DatePipe, NgClass, NgForOf, NgIf, NgSwitch, NgSwitchCase } from '@angular/common';

@Component({
  selector: 'app-table',
	imports: [
		NgClass,
		NgForOf,
		NgIf,
		NgSwitch,
		NgSwitchCase
	],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [DatePipe]
})
export class TableComponent<T extends {}> {
	@Input({ required: true })
	public datas!: T[];

	@Input({ required: true })
	public columns!: TableColumn<T>[];

	@Input()
	public actions?: TableAction<T>[];

	@Output()
	public callback: EventEmitter<Partial<T>> = new EventEmitter<Partial<T>>();

	public readonly primitive = Primitive;

	private datePipe = inject(DatePipe);

	public formatDate(value: unknown): string | null {
		if (value instanceof Date) {
			return this.datePipe.transform(value, 'dd/MM/yyyy');
		}
		return null;
	}
}
