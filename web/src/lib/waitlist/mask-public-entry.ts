/**
 * Masks guest-identifying fields for public waitlist queue display.
 */

/** First visible character + bullets; empty when no name parts. */
export function maskWaitlistGuestName(
	name: string | null | undefined,
	lastName: string | null | undefined,
): string {
	const parts = [name?.trim(), lastName?.trim()].filter((p): p is string =>
		Boolean(p),
	);
	const full = parts.join("");
	if (!full) {
		return "";
	}
	const chars = [...full];
	const first = chars[0] ?? "";
	return `${first}＊＊`;
}

/** Last three digits only; empty when phone has fewer than 3 digits. */
export function maskWaitlistPhoneLast3(
	phone: string | null | undefined,
): string {
	const digits = (phone ?? "").replace(/\D/g, "");
	if (digits.length < 3) {
		return "";
	}
	return `＊＊${digits.slice(-3)}`;
}

/**
 * Public queue row label: masked name, else masked phone (last 3 digits), else empty (caller shows "Guest").
 */
export function formatPublicWaitlistGuestLabel(params: {
	name: string | null | undefined;
	lastName: string | null | undefined;
	phone: string | null | undefined;
}): string {
	const maskedName = maskWaitlistGuestName(params.name, params.lastName);
	if (maskedName) {
		return maskedName;
	}
	return maskWaitlistPhoneLast3(params.phone);
}
