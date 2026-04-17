import type { ApiErrorPayload, ApiResponse, QueryValue } from '../types/common';

type PrimitiveQuery = QueryValue | null | undefined;
type QueryRecord = Record<string, PrimitiveQuery | PrimitiveQuery[]>;

export class ApiClientError extends Error {
	status: number;
	url: string;
	payload: unknown;

	constructor(message: string, status: number, url: string, payload: unknown) {
		super(message);
		this.name = 'ApiClientError';
		this.status = status;
		this.url = url;
		this.payload = payload;
	}
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

function toQueryString(query?: QueryRecord): string {
	if (!query) {
		return '';
	}

	const params = new URLSearchParams();
	Object.entries(query).forEach(([key, value]) => {
		if (value === null || value === undefined) {
			return;
		}

		if (Array.isArray(value)) {
			value.forEach((item) => {
				if (item !== null && item !== undefined) {
					params.append(key, String(item));
				}
			});
			return;
		}

		params.append(key, String(value));
	});

	const result = params.toString();
	return result ? `?${result}` : '';
}

function resolveErrorMessage(payload: unknown, fallback: string): string {
	if (!payload || typeof payload !== 'object') {
		return fallback;
	}

	const maybeError = payload as ApiErrorPayload;
	return maybeError.detail || maybeError.error || maybeError.message || fallback;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
	query?: QueryRecord;
	body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const { query, body, headers, ...rest } = options;
	const url = `${API_BASE_URL}${path}${toQueryString(query)}`;

	const requestHeaders = new Headers(headers);
	requestHeaders.set('Accept', 'application/json');

	let requestBody: BodyInit | undefined;
	if (body !== undefined) {
		requestHeaders.set('Content-Type', 'application/json');
		requestBody = JSON.stringify(body);
	}

	let response: Response;
	try {
		response = await fetch(url, {
			...rest,
			headers: requestHeaders,
			body: requestBody,
		});
	} catch {
		throw new ApiClientError(
			`Cannot reach API server at ${API_BASE_URL}. Check backend status and NEXT_PUBLIC_API_URL.`,
			0,
			url,
			null
		);
	}

	const text = await response.text();
	const contentType = response.headers.get('content-type') || '';
	const isHtmlResponse = contentType.includes('text/html') || text.trim().startsWith('<!DOCTYPE html>');

	if (isHtmlResponse) {
		throw new ApiClientError(
			`Received HTML from ${url}. API URL is likely misconfigured (pointing to Next.js app). Set NEXT_PUBLIC_API_URL to FastAPI origin, e.g. http://localhost:8000.`,
			response.status,
			url,
			text
		);
	}

	let payload: unknown = null;
	if (text) {
		try {
			payload = JSON.parse(text) as unknown;
		} catch {
			payload = { message: text };
		}
	}

	if (!response.ok) {
		const message = resolveErrorMessage(payload, `HTTP ${response.status}`);
		throw new ApiClientError(message, response.status, url, payload);
	}

	return payload as T;
}

export function requireSuccessData<T>(response: ApiResponse<T>, fallback = 'API returned unsuccessful response'): T {
	if (!response.success || response.data === null) {
		throw new Error(response.error || fallback);
	}
	return response.data;
}

export const api = {
	get<T>(path: string, query?: QueryRecord): Promise<T> {
		return request<T>(path, { method: 'GET', query });
	},
	post<T>(path: string, body?: unknown): Promise<T> {
		return request<T>(path, { method: 'POST', body });
	},
	put<T>(path: string, body?: unknown): Promise<T> {
		return request<T>(path, { method: 'PUT', body });
	},
	patch<T>(path: string, body?: unknown): Promise<T> {
		return request<T>(path, { method: 'PATCH', body });
	},
	delete<T>(path: string): Promise<T> {
		return request<T>(path, { method: 'DELETE' });
	},
};
