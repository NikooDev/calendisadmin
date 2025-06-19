import { EventEmitter } from '@angular/core';

export interface ToastInterface {
	onAction: () => EventEmitter<void>;
	close: () => void;
}

export enum ToastTypeEnum {
	SUCCESS = 'success',
	WARNING = 'warning',
	ERROR = 'error',
	INFO = 'info'
}

export const Primitive = {
	string: 'string',
	number: 'number',
	boolean: 'boolean',
	date: 'date'
};

export const Appearence = {
	primary: 'primary',
	delete: 'delete'
};

export type PrimitiveType = typeof Primitive[keyof typeof Primitive];
export type AppearenceType = typeof Appearence[keyof typeof Appearence];

export interface TableColumn<T> {
	label: string;
	key: keyof T & string;
	type: PrimitiveType;
	width?: string;
	transformer?: (data: T) => any;
}

export interface TableAction<T> {
	icon?: string;
	title?: string;
	callback: (data?: T) => void;
	type: AppearenceType
}
