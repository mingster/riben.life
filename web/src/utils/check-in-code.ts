import type { PrismaClient } from "@prisma/client";

const CHECK_IN_CODE_LENGTH = 8;
const MAX_ATTEMPTS = 10;

/**
 * Generates an 8-digit numeric check-in code (date-based prefix + random suffix).
 * Format: 2 digits from date (day of year % 100) + 6 random digits.
 * Ensures uniqueness per store by checking the database.
 */
export async function generateCheckInCode(
	storeId: string,
	prisma:
		| PrismaClient
		| Omit<
				PrismaClient,
				| "$connect"
				| "$disconnect"
				| "$on"
				| "$transaction"
				| "$use"
				| "$extends"
		  >,
): Promise<string> {
	for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
		const now = new Date();
		const dayOfYear = Math.floor(
			(now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) /
				(24 * 60 * 60 * 1000),
		);
		const datePart = String(dayOfYear % 100).padStart(2, "0");
		const randomPart = String(Math.floor(Math.random() * 1_000_000)).padStart(
			6,
			"0",
		);
		const code = `${datePart}${randomPart}`;

		const existing = await prisma.rsvp.findFirst({
			where: { storeId, checkInCode: code },
			select: { id: true },
		});
		if (!existing) {
			return code;
		}
	}
	throw new Error("Failed to generate unique check-in code after max attempts");
}

/** Returns true if the input looks like an 8-digit check-in code. */
export function isCheckInCodeInput(value: string): boolean {
	const trimmed = value.trim();
	return /^\d{8}$/.test(trimmed);
}

/** CUID is 25 chars; UUID is 36 with hyphens. */
const RSVP_ID_LIKE = /^[a-zA-Z0-9_-]{20,36}$/;

/**
 * Parses content scanned from a QR code for check-in.
 * Returns the string to use for check-in: either an 8-digit checkInCode or an rsvpId.
 * - 8 digits → check-in code
 * - URL or path with rsvpId= → extracted rsvpId
 * - Otherwise if it looks like an id (cuid/uuid) → rsvpId
 */
export function parseScannedCheckInValue(scanned: string): string | null {
	const trimmed = scanned.trim();
	if (!trimmed) return null;
	if (isCheckInCodeInput(trimmed)) return trimmed;
	// Try to get rsvpId from URL or path (e.g. ...?rsvpId=xxx or .../checkin?rsvpId=xxx)
	if (trimmed.includes("rsvpId=")) {
		try {
			const url = trimmed.startsWith("http")
				? new URL(trimmed)
				: new URL(trimmed, "https://dummy");
			const rsvpId = url.searchParams.get("rsvpId");
			if (rsvpId?.trim()) return rsvpId.trim();
		} catch {
			// fall through
		}
	}
	if (RSVP_ID_LIKE.test(trimmed)) return trimmed;
	return null;
}
