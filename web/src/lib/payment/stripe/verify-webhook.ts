import type Stripe from "stripe";
import logger from "@/lib/logger";
import { stripe } from "@/lib/payment/stripe/config";

/**
 * Ordered signing secrets for `stripe.webhooks.constructEvent`.
 * - `STRIPE_WEBHOOK_SECRET` — primary endpoint
 * - `STRIPE_WEBHOOK_SECRET_CONNECT` — optional second secret (e.g. Connect / extra endpoint)
 * - `STRIPE_WEBHOOK_SECRETS` — optional comma-separated list (merged after the above, deduped)
 */
export function getStripeWebhookSigningSecrets(): string[] {
	const seen = new Set<string>();
	const out: string[] = [];

	const push = (s: string | undefined) => {
		const t = s?.trim();
		if (t && !seen.has(t)) {
			seen.add(t);
			out.push(t);
		}
	};

	push(process.env.STRIPE_WEBHOOK_SECRET);
	push(process.env.STRIPE_WEBHOOK_SECRET_CONNECT);

	const csv = process.env.STRIPE_WEBHOOK_SECRETS?.trim();
	if (csv) {
		for (const part of csv.split(",")) {
			push(part);
		}
	}

	return out;
}

export type VerifyStripeWebhookResult =
	| { ok: true; event: Stripe.Event }
	| { ok: false; response: Response };

/**
 * Verify Stripe signature using the configured secret list (first match wins).
 */
export function verifyStripeWebhookFromRawBody(
	rawBody: string,
	stripeSignatureHeader: string | null,
): VerifyStripeWebhookResult {
	const secrets = getStripeWebhookSigningSecrets();

	if (!stripeSignatureHeader || secrets.length === 0) {
		return {
			ok: false,
			response: new Response("Webhook secret not found.", { status: 400 }),
		};
	}

	let lastMessage = "Signature verification failed";
	for (const secret of secrets) {
		try {
			const event = stripe.webhooks.constructEvent(
				rawBody,
				stripeSignatureHeader,
				secret,
			);
			return { ok: true, event };
		} catch (err: unknown) {
			lastMessage = err instanceof Error ? err.message : String(err);
		}
	}

	logger.error("Stripe webhook signature verification failed", {
		metadata: { error: lastMessage },
		tags: ["api", "stripe", "webhook", "error"],
	});

	return {
		ok: false,
		response: new Response(`Webhook Error: ${lastMessage}`, { status: 400 }),
	};
}
