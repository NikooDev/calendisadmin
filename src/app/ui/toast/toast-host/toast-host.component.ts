import { AfterViewInit, Component, inject, ViewChild, ViewContainerRef } from '@angular/core';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-toast-host',
  imports: [],
  templateUrl: './toast-host.component.html',
  styleUrl: './toast-host.component.scss'
})
export class ToastHostComponent implements AfterViewInit {
	@ViewChild('toastContainer', { static: true, read: ViewContainerRef })
	public toastContainer!: ViewContainerRef;

	private toastService = inject(ToastService);

	ngAfterViewInit(): void {
		this.toastService.setViewContainerRef(this.toastContainer);
	}
}
