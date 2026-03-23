import { createHmac, randomBytes } from "node:crypto";

import { safeEqualHex } from "./token-crypto";

function getStateSecret(): string {
	const s =
		process.env.GOOGLE_OAUTH_STATE_SECRET ||
		process.env.BETTER_AUTH_SECRET ||
		"";
	if (s.length < 16) {
		throw new Error(
			"GOOGLE_OAUTH_STATE_SECRET or BETTER_AUTH_SECRET must be set for Google OAuth state",
		);
	}
	return s;
}

export interface GoogleCalendarOAuthStatePayload {
	storeId: string;
	userId: string;
	nonce: string;
}

/**
 * Signs OAuth state for Google Calendar connect (storeId + userId bound to session).
 */
export function signGoogleCalendarOAuthState(
	payload: GoogleCalendarOAuthStatePayload,
): string {
	const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
	const sig = createHmac("sha256", getStateSecret())
		.update(body)
		.digest("hex");
	return `${body}.${sig}`;
}

/**
 * Verifies and parses OAuth state from the callback query.
 */
export function verifyGoogleCalendarOAuthState(
	combined: string,
): GoogleCalendarOAuthStatePayload | null {
	const parts = combined.split(".");
	if (parts.length !== 2) {
		return null;
	}
	const [body, sig] = parts;
	const expected = createHmac("sha256", getStateSecret())
		.update(body)
		.digest("hex");
	if (!safeEqualHex(expected, sig)) {
		return null;
	}
	try {
		const json = Buffer.from(body, "base64url").toString("utf8");
		const parsed = JSON.parse(json) as GoogleCalendarOAuthStatePayload;
		if (
			typeof parsed.storeId === "string" &&
			parsed.storeId.length > 0 &&
			typeof parsed.userId === "string" &&
			parsed.userId.length > 0 &&
			typeof parsed.nonce === "string"
		) {
			return parsed;
		}
	} catch {
		return null;
	}
	return null;
}

export function createOAuthNonce(): string {
	return randomBytes(16).toString("hex");
}
