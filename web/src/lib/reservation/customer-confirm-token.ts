import { createHmac, timingSafeEqual } from "crypto";

export const RSVP_CUSTOMER_CONFIRM_SECRET_ENV = "RSVP_CUSTOMER_CONFIRM_SECRET";

function getSecret(): string {
	const explicit = process.env.RSVP_CUSTOMER_CONFIRM_SECRET?.trim();
	if (explicit) return explicit;
	const fallback =
		process.env.BETTER_AUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
	if (fallback) return fallback;
	throw new Error(
		`${RSVP_CUSTOMER_CONFIRM_SECRET_ENV} (or BETTER_AUTH_SECRET / AUTH_SECRET fallback) is required for RSVP customer confirmation links`,
	);
}

/** Default token lifetime: 30 days from issuance (milliseconds). */
export const RSVP_CUSTOMER_CONFIRM_TOKEN_TTL_MS =
	Number(process.env.RSVP_CUSTOMER_CONFIRM_TOKEN_TTL_MS) ||
	30 * 24 * 60 * 60 * 1000;

export interface RsvpCustomerConfirmPayload {
	storeId: string;
	rsvpId: string;
	exp: number;
}

function encodePayload(p: RsvpCustomerConfirmPayload): string {
	return Buffer.from(JSON.stringify(p), "utf8").toString("base64url");
}

function decodePayload(raw: string): RsvpCustomerConfirmPayload | null {
	try {
		const json = Buffer.from(raw, "base64url").toString("utf8");
		const o = JSON.parse(json) as unknown;
		if (
			o &&
			typeof o === "object" &&
			"storeId" in o &&
			"rsvpId" in o &&
			"exp" in o &&
			typeof (o as RsvpCustomerConfirmPayload).storeId === "string" &&
			typeof (o as RsvpCustomerConfirmPayload).rsvpId === "string" &&
			typeof (o as RsvpCustomerConfirmPayload).exp === "number"
		) {
			return o as RsvpCustomerConfirmPayload;
		}
		return null;
	} catch {
		return null;
	}
}

export function signRsvpCustomerConfirmToken(params: {
	storeId: string;
	rsvpId: string;
	expiresAtMs?: number;
}): string {
	const exp =
		params.expiresAtMs ?? Date.now() + RSVP_CUSTOMER_CONFIRM_TOKEN_TTL_MS;
	const payload: RsvpCustomerConfirmPayload = {
		storeId: params.storeId,
		rsvpId: params.rsvpId,
		exp,
	};
	const body = encodePayload(payload);
	const sig = createHmac("sha256", getSecret())
		.update(body)
		.digest("base64url");
	return `${body}.${sig}`;
}

export function verifyRsvpCustomerConfirmToken(
	token: string,
	nowMs: number = Date.now(),
): RsvpCustomerConfirmPayload | null {
	const parts = token.split(".");
	if (parts.length !== 2) return null;
	const [body, sig] = parts;
	if (!body || !sig) return null;
	const expected = createHmac("sha256", getSecret())
		.update(body)
		.digest("base64url");

	const a = Buffer.from(sig);
	const b = Buffer.from(expected);
	if (a.length !== b.length || !timingSafeEqual(a, b)) {
		return null;
	}

	const payload = decodePayload(body);
	if (!payload || payload.exp < nowMs) return null;
	return payload;
}
