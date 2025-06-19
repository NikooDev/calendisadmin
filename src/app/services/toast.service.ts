import { ComponentRef, Injectable, ViewContainerRef } from '@angular/core';
import { ToastComponent } from '../ui/toast/toast.component';
import { BehaviorSubject, Subscription } from 'rxjs';
import { ToastInterface, ToastTypeEnum } from '../types/ui';

/**
 * @description Service responsible for managing toast notifications.
 * The service allows to open and manage the lifecycle of toast messages, including manual and automatic closing.
 */
@Injectable({
  providedIn: 'root'
})
export class ToastService {
	/**
	 * @description An array holding all the currently active toasts.
	 * @type {Array<ComponentRef<ToastComponent>>}
	 * @private
	 */
	private toasts: Array<ComponentRef<ToastComponent>> = [];

	/**
	 * @description A subject that holds the current list of toasts and broadcasts updates.
	 * @type {BehaviorSubject<ComponentRef<ToastComponent>[]>}
	 * @private
	 */
	private toastSubject: BehaviorSubject<ComponentRef<ToastComponent>[]> = new BehaviorSubject<ComponentRef<ToastComponent>[]>([]);

	/**
	 * @description A reference to the container where toasts will be inserted.
	 * @type {ViewContainerRef}
	 * @private
	 */
	private viewContainerRef!: ViewContainerRef;

	/**
	 * @description Sets the view container reference for the toast component to be injected into.
	 * This method must be called before `open()` is invoked to set the container where toasts will be dynamically added.
	 * @param {ViewContainerRef} viewContainerRef - The view container reference for the toast container.
	 */
	public setViewContainerRef(viewContainerRef: ViewContainerRef): void {
		this.viewContainerRef = viewContainerRef;
	}

	/**
	 * @description Opens a toast with a message, an optional action text, and an optional duration.
	 * This method creates a new toast component and displays it in the provided container.
	 * A toast will automatically close after the specified duration or can be closed manually.
	 * @param {ToastTypeEnum} type - The type of toast
	 * @param {string} message - The message to be displayed in the toast.
	 * @param {string} [actionText=''] - The optional text to be displayed on the toast action button.
	 * @param {object} [options={ duration: 3000 }] - The options object containing the toast configuration.
	 * @param {number} [options.duration=3000] - The duration for which the toast will be visible before auto-close.
	 * @returns {onAction: () => EventEmitter<void>, close: () => void} An object containing the `onAction` and `close` methods for interacting with the toast.
	 * @throws {Error} Throws an error if `viewContainerRef` is not set.
	 */
	public open(type: ToastTypeEnum, message: string, actionText: string = '', options: { unique?: boolean, duration?: number } = {}): ToastInterface | null {
		if (!this.viewContainerRef) {
			throw new Error('ViewContainerRef must be defined');
		}

		if (options.unique && this.toasts.some(toast => toast.instance.type === type && toast.instance.message === message)) {
			return null;
		}

		const toastRef = this.viewContainerRef.createComponent(ToastComponent);
		const toast = toastRef.instance;

		toast.type = type;
		toast.message = message;
		toast.actionText = actionText;
		toast.duration = options.duration || 5000;

		toast.cdr.detectChanges();

		this.toasts.push(toastRef);
		this.toastSubject.next(this.toasts);

		// Close toast from event emitter
		const closeSubscription: Subscription = toast.closeToast.subscribe(() => {
			this.removeToast(toastRef);
			closeSubscription.unsubscribe();
		});

		setTimeout(() => {
			toast.close();
		}, toast.duration);

		return {
			onAction: () => toast.action,
			close: () => toast.close()
		};
	}

	/**
	 * @description Removes a specific toast from the list of active toasts.
	 * This method is used internally to update the list of active toasts after a toast is closed.
	 * @param {ComponentRef<ToastComponent>} toastRef - The toast component instance to be removed.
	 */
	public removeToast(toastRef: ComponentRef<ToastComponent>) {
		const index = this.toasts.indexOf(toastRef);

		if (index !== -1) {
			this.toasts.splice(index, 1);
			this.viewContainerRef.remove(this.viewContainerRef.indexOf(toastRef.hostView));
			toastRef.destroy();
		}

		this.toastSubject.next(this.toasts);
	}
}
