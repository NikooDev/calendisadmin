import { ChangeDetectionStrategy, Component, ElementRef, Input, OnDestroy, Renderer2, ViewChild } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
	selector: 'app-tooltip',
	templateUrl: './tooltip.component.html',
	styleUrls: ['./tooltip.component.scss'],
	imports: [
		NgIf
	],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class TooltipComponent implements OnDestroy {
	@Input({ required: true })
	public content: string = '';

	@Input()
	public position: 'top' | 'bottom' = 'bottom';

	@Input()
	public align: 'center' | 'left' | 'right' = 'left';

	@Input()
	public offset: number = 0;

  @Input()
	public full: boolean = false;

	public isTooltipVisible: boolean = false;
  private mouseLeaveListener!: () => void;

	@ViewChild('tooltipContainer') tooltipContainer!: ElementRef;
	@ViewChild('tooltip') tooltip!: ElementRef;

	constructor(private renderer: Renderer2) {}

  ngOnDestroy() {
    if (this.mouseLeaveListener) {
      this.mouseLeaveListener();
    }
  }

  public onMouseEnter() {
		this.isTooltipVisible = true;

		const triggerWidth = this.tooltipContainer.nativeElement.offsetWidth;
		const triggerLeft = this.tooltipContainer.nativeElement.offsetLeft;

		let tooltipLeft: number;
		let tooltipWidth: number;

		switch (this.align) {
			case 'center':
				tooltipWidth = this.tooltip.nativeElement.offsetWidth;
				tooltipLeft = triggerLeft + (triggerWidth - tooltipWidth) / 2;
				break;

			case 'left':
				tooltipLeft = triggerLeft;
				break;

			case 'right':
				tooltipWidth = this.tooltip.nativeElement.offsetWidth;
				tooltipLeft = triggerLeft + triggerWidth - tooltipWidth;
				break;

			default:
				tooltipLeft = triggerLeft;
				break;
		}

		if (this.align === 'center') {
			this.renderer.setStyle(this.tooltip.nativeElement, 'left', `50%`);
		} else if (this.align === 'left') {
			this.renderer.setStyle(this.tooltip.nativeElement, 'left', `${tooltipLeft}px`);
		} else {
			this.renderer.setStyle(this.tooltip.nativeElement, 'right', `0`);
		}

		const triggerHeight = this.tooltipContainer.nativeElement.offsetHeight;

		if (this.position === 'top') {
			const top = triggerHeight + this.offset;
			this.renderer.setStyle(this.tooltip.nativeElement, 'top', `calc(-${top}px - ${this.offset}px)`);
		} else {
			this.renderer.setStyle(this.tooltip.nativeElement, 'top', '100%');
		}

    this.mouseLeaveListener = this.renderer.listen(this.tooltipContainer.nativeElement, 'mouseleave', () => {
      this.onMouseLeave();
    });
	}

	public onMouseLeave() {
		this.isTooltipVisible = false;
	}
}
