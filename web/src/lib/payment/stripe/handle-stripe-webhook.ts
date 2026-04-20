import { NextResponse } from "next/server";
import type Stripe from "stripe";
import logger from "@/lib/logger";
import { stripePlugin } from "@/lib/payment/plugins/stripe-plugin";
import { verifyStripeWebhookFromRawBody } from "@/lib/payment/stripe/verify-webhook";

const shopStripeEventTypes = new Set<string>([
	"payment_intent.succeeded",
	"payment_intent.payment_failed",
	"payment_intent.canceled",
]);

const platformStripeEventTypes = new Set<string>([
	"product.created",
	"product.updated",
	"product.deleted",
	"price.created",
	"price.updated",
	"price.deleted",
	"checkout.session.completed",
	"customer.subscription.created",
	"customer.subscription.updated",
	"customer.subscription.deleted",
]);

function isShopStripeEvent(type: string): boolean {
	return shopStripeEventTypes.has(type);
}

function isPlatformStripeEvent(type: string): boolean {
	return platformStripeEventTypes.has(type);
}

/**
 * Verify signature and run shop + platform handlers for a Stripe webhook.
 */
export async function handleStripeWebhookPost(req: Request): Promise<Response> {
	const body = await req.text();
	const sig = req.headers.get("stripe-signature");

	const verified = verifyStripeWebhookFromRawBody(body, sig);
	if (!verified.ok) {
		return verified.response;
	}

	logger.info("Stripe webhook received", {
		tags: ["api", "stripe", "webhook"],
		metadata: { type: verified.event.type },
	});

	try {
		const res = await dispatchStripeWebhookEvent(verified.event);
		return res;
	} catch (error: unknown) {
		logger.error("Stripe webhook dispatch failed", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["stripe", "webhook", "error"],
		});

		return new NextResponse("Webhook handler failed. View your server logs.", {
			status: 400,
		});
	}
}

export async function dispatchStripeWebhookEvent(
	event: Stripe.Event,
): Promise<Response> {
	if (isShopStripeEvent(event.type)) {
		await stripePlugin.handleShopPaymentIntentWebhook(event);
		return NextResponse.json({ received: true });
	}

	if (isPlatformStripeEvent(event.type)) {
		await stripePlugin.handlePlatformBillingWebhook(event);
		return NextResponse.json({ received: true });
	}

	logger.info("Stripe webhook ignored (unknown event type)", {
		metadata: { type: event.type },
		tags: ["stripe", "webhook"],
	});

	return NextResponse.json({ received: true, ignored: true });
}
