import { createHmac, timingSafeEqual } from "crypto";

export const RSVP_POST_PAYMENT_SECRET_ENV = "RSVP_POST_PAYMENT_SECRET";

export interface RsvpPostPaymentPayload {
	orderId: string;
	userId: string;
	exp: number;
}

/** Default token lifetime: 10 minutes. */
export const RSVP_POST_PAYMENT_TOKEN_TTL_MS =
	Number(process.env.RSVP_POST_PAYMENT_TOKEN_TTL_MS) || 10 * 60 * 1000;

function getSecret(): string {
	const explicit = process.env.RSVP_POST_PAYMENT_SECRET?.trim();
	if (explicit) {
		return explicit;
	}

	const fallback =
		process.env.BETTER_AUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
	if (fallback) {
		return fallback;
	}

	throw new Error(
		`${RSVP_POST_PAYMENT_SECRET_ENV} (or BETTER_AUTH_SECRET / AUTH_SECRET fallback) is required for RSVP post-payment sign-in`,
	);
}

function encodePayload(payload: RsvpPostPaymentPayload): string {
	return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(raw: string): RsvpPostPaymentPayload | null {
	try {
		const json = Buffer.from(raw, "base64url").toString("utf8");
		const parsed = JSON.parse(json) as unknown;
		if (
			parsed &&
			typeof parsed === "object" &&
			"orderId" in parsed &&
			"userId" in parsed &&
			"exp" in parsed &&
			typeof (parsed as RsvpPostPaymentPayload).orderId === "string" &&
			typeof (parsed as RsvpPostPaymentPayload).userId === "string" &&
			typeof (parsed as RsvpPostPaymentPayload).exp === "number"
		) {
			return parsed as RsvpPostPaymentPayload;
		}
		return null;
	} catch {
		return null;
	}
}

export function signRsvpPostPaymentToken(params: {
	orderId: string;
	userId: string;
	expiresAtMs?: number;
}): string {
	const payload: RsvpPostPaymentPayload = {
		orderId: params.orderId,
		userId: params.userId,
		exp: params.expiresAtMs ?? Date.now() + RSVP_POST_PAYMENT_TOKEN_TTL_MS,
	};
	const body = encodePayload(payload);
	const signature = createHmac("sha256", getSecret())
		.update(body)
		.digest("base64url");
	return `${body}.${signature}`;
}

export function verifyRsvpPostPaymentToken(
	token: string,
	nowMs: number = Date.now(),
): RsvpPostPaymentPayload | null {
	const [body, signature] = token.split(".");
	if (!body || !signature) {
		return null;
	}
	const expected = createHmac("sha256", getSecret())
		.update(body)
		.digest("base64url");

	const a = Buffer.from(signature, "utf8");
	const b = Buffer.from(expected, "utf8");
	if (a.length !== b.length || !timingSafeEqual(a, b)) {
		return null;
	}

	const payload = decodePayload(body);
	if (!payload || payload.exp < nowMs) {
		return null;
	}
	return payload;
}
