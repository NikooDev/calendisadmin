import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  EventEmitter,
  Component,
  inject,
  Output,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import {
	AnimationBuilder, AnimationFactory, animate, style
} from '@angular/animations';
import { ToastTypeEnum } from '../../types/ui';

@Component({
  selector: 'app-toast',
	imports: [
		NgIf,
		NgClass
	],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastComponent implements OnInit, OnDestroy {
	public type: ToastTypeEnum = ToastTypeEnum.INFO;

	public message: string = '';

	public actionText: string = '';

	public duration: number = 5000;

	public cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

	private timeoutId!: ReturnType<typeof setTimeout>;

	private el = inject(ElementRef);

	private builder = inject(AnimationBuilder);

	private openAnimation = this.builder.build([
		style({ opacity: 0, transform: 'translateY(-20px)' }),
		animate('300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)', style({ opacity: 1, transform: 'translateY(20px)' }))
	]);

	private closeAnimation = this.builder.build([
		style({ opacity: 1, transform: 'translateY(20px)' }),
		animate('500ms cubic-bezier(0.68, -0.885, 0.27, 1.55)', style({ opacity: 0, transform: 'translateY(-20px)' }))
	]);

	@Output()
	public action = new EventEmitter<void>();

	@Output()
	public closeToast = new EventEmitter<void>();

	ngOnInit() {
		this.playAnimation(this.openAnimation);

		this.timeoutId = setTimeout(() => {
			this.close();
		}, this.duration);
	}

	ngOnDestroy() {
		clearTimeout(this.timeoutId);
	}

	public checkType() {
		return {
			'success': this.type === ToastTypeEnum.SUCCESS,
			'warning': this.type === ToastTypeEnum.WARNING,
			'error': this.type === ToastTypeEnum.ERROR,
			'info': this.type === ToastTypeEnum.INFO
		}
	}

	public onAction() {
		this.action.emit();
	}

	public close() {
		clearTimeout(this.timeoutId);

		this.playAnimation(this.closeAnimation);
	}

	private playAnimation(animation: AnimationFactory) {
		const toast = animation.create(this.el.nativeElement.querySelector('.toast'));

    toast.play();

    toast.onDone(() => {
			if (animation === this.closeAnimation) {
				this.closeToast.emit();
			}
		});
	}
}
