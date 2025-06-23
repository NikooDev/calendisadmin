import { Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DialogService {
	private dialogState = new Map<string, WritableSignal<boolean>>();

	public open(id: string) {
		if (!this.dialogState.has(id)) {
			this.dialogState.set(id, signal(true));
		} else {
			this.dialogState.get(id)?.set(true);
		}
	}

	public close(id: string) {
		this.dialogState.get(id)?.set(false);
	}

	public isOpen(id: string): WritableSignal<boolean> {
		if (!this.dialogState.has(id)) {
			this.dialogState.set(id, signal(false));
		}
		return this.dialogState.get(id)!;
	}
}
