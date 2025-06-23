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
  public position: 'top' | 'bottom' | 'left' | 'right' = 'top';

	@Input()
	public align: 'center' | 'left' | 'right' = 'left';

	@Input()
	public offset: number = 4;

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

    const trigger = this.tooltipContainer.nativeElement;
    const tooltip = this.tooltip.nativeElement;

    const triggerWidth = trigger.offsetWidth;
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;

    if (this.position === 'left') {
      this.renderer.setStyle(tooltip, 'right', `calc(100% + ${this.offset}px)`);
      this.renderer.setStyle(
        tooltip,
        'top',
        `calc(50% - ${tooltipHeight / 2}px)`
      );
    } else if (this.position === 'right') {
      this.renderer.setStyle(tooltip, 'left', `calc(100% + ${this.offset}px)`);
      this.renderer.setStyle(
        tooltip,
        'top',
        `calc(50% - ${tooltipHeight / 2}px)`
      );
    } else if (this.position === 'top') {
      this.renderer.setStyle(
        tooltip,
        'top',
        `calc(-${tooltipHeight + this.offset}px)`
      );
      this.renderer.setStyle(
        tooltip,
        'left',
        this.getHorizontalAlign(triggerWidth, tooltipWidth)
      );
    } else if (this.position === 'bottom') {
      this.renderer.setStyle(tooltip, 'top', `calc(100% + ${this.offset}px)`);
      this.renderer.setStyle(
        tooltip,
        'left',
        this.getHorizontalAlign(triggerWidth, tooltipWidth)
      );
    }

    this.mouseLeaveListener = this.renderer.listen(trigger, 'mouseleave', () => this.onMouseLeave());
  }

  private getHorizontalAlign(triggerWidth: number, tooltipWidth: number): string {
    switch (this.align) {
      case 'center':
        return `calc(50% - ${tooltipWidth / 2}px)`;
      case 'right':
        return `${triggerWidth - tooltipWidth}px`;
      case 'left':
      default:
        return `0`;
    }
  }

	public onMouseLeave() {
		this.isTooltipVisible = false;
	}
}
