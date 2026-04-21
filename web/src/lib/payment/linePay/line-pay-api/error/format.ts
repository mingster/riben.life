export class FormatError extends Error {}

export function isFormatError(error: unknown): error is FormatError {
	return error instanceof FormatError;
}
