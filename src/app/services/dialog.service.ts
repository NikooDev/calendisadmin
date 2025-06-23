import { Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DialogService {
	private dialogState = new Map<string, WritableSignal<boolean>>();
  private resolvers = new Map<string, { resolve: (value?: unknown) => void; reject: () => void }>();

	public open(id: string) {
		if (!this.dialogState.has(id)) {
			this.dialogState.set(id, signal(true));
		} else {
			this.dialogState.get(id)?.set(true);
		}

    return new Promise((resolve, reject) => {
      this.resolvers.set(id, { resolve, reject });
    });
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

  public confirm(id: string) {
    this.close(id);
    this.resolvers.get(id)?.resolve();
    this.resolvers.delete(id);
  }

  public cancel(id: string) {
    this.close(id);
    this.resolvers.get(id)?.reject();
    this.resolvers.delete(id);
  }
}
