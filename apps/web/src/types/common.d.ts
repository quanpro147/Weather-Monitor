export type ISODateString = `${number}-${number}-${number}`;

export type QueryValue = string | number | boolean;

export interface ApiResponse<T> {
	success: boolean;
	data: T | null;
	error: string | null;
}

export interface PaginatedResponse<T> {
	success: boolean;
	data: T[];
	total: number;
	page: number;
	limit: number;
}

export interface ApiErrorPayload {
	detail?: string;
	error?: string;
	message?: string;
}
