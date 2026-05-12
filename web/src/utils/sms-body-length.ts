import { SafeError } from "@/utils/error";

const SMS_BODY_MAX_ASCII_LENGTH = 160;
const SMS_BODY_MAX_UNICODE_LENGTH = 80;

export function isAsciiOnlySmsText(text: string): boolean {
	for (const char of text) {
		if (char.codePointAt(0)! > 0x7f) {
			return false;
		}
	}
	return true;
}

export function getSmsBodyCharacterLimit(text: string): number {
	return isAsciiOnlySmsText(text)
		? SMS_BODY_MAX_ASCII_LENGTH
		: SMS_BODY_MAX_UNICODE_LENGTH;
}

export function validateSmsBodyLength(text: string): {
	ok: boolean;
	limit: number;
	length: number;
} {
	const limit = getSmsBodyCharacterLimit(text);
	const length = [...text].length;
	return {
		ok: length <= limit,
		limit,
		length,
	};
}

export function formatSmsBodyLengthError(text: string): string | null {
	const { ok, limit, length } = validateSmsBodyLength(text);
	if (ok) {
		return null;
	}
	const encoding = limit === SMS_BODY_MAX_ASCII_LENGTH ? "ASCII" : "Unicode";
	return `SMS body must be at most ${limit} characters for ${encoding} content (current: ${length}).`;
}

export function assertSmsTemplateBodyLength(
	templateType: string | null | undefined,
	body: string,
): void {
	if (templateType?.toLowerCase() !== "sms") {
		return;
	}
	const message = formatSmsBodyLengthError(body);
	if (message) {
		throw new SafeError(message);
	}
}
