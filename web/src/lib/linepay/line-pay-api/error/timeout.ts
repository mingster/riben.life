export class TimeoutError extends Error {}

export function isTimeoutError(error: unknown): error is TimeoutError {
	return error instanceof TimeoutError;
}
