export interface WhereSearchParameter {
	where: string;
	operator: '>=' | '==' | '<=' | '!=' | 'array-contains' | 'array-contains-any' | 'in' | 'not-in';
	value: string | Date | number | boolean;
}

export interface SortSearchParameter {
	sortBy: string;
	direction: 'asc' | 'desc';
}

export interface LimitSearchParameter {
	limit: number;
	limitToLast: boolean;
}

export enum ErrorAuth {
	INVALID_EMAIL = 'auth/invalid-email',
	USER_DISABLED = 'auth/user-disabled',
	USER_NOT_FOUND = 'auth/user-not-found',
	WRONG_PASSWORD = 'auth/wrong-password',
	EMAIL_ALREADY_IN_USE = 'auth/email-already-in-use',
	WEAK_PASSWORD = 'auth/weak-password',
	TOO_MANY_REQUESTS = 'auth/too-many-requests',
	NETWORK_REQUEST_FAILED = 'auth/network-request-failed',
	OTHER = 'auth/other',
}
