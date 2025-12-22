import { stripe } from "@/lib/stripe/config";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

/**
 * Create Stripe PaymentIntent API route.
 * Used by checkout and credit recharge flows to create payment intents.
 *
 * Request Body:
 * - total: number (order total in currency units, e.g., 100.00 for $100)
 * - currency: string (ISO currency code, e.g., "usd", "twd")
 * - stripeCustomerId?: string (optional Stripe customer ID)
 * - orderId?: string (optional order ID for webhook metadata)
 * - storeId?: string (optional store ID for webhook metadata)
 *
 * Returns:
 * - Stripe PaymentIntent object with client_secret
 */
export async function POST(req: Request) {
	try {
		const data = await req.json();
		const { total, currency, stripeCustomerId, orderId, storeId } = data;

		// Validate total
		if (total === undefined || total === null) {
			return NextResponse.json(
				{ success: false, message: "Total is required." },
				{ status: 400 },
			);
		}

		if (typeof total !== "number" || Number.isNaN(total) || total <= 0) {
			return NextResponse.json(
				{ success: false, message: "Total must be a positive number." },
				{ status: 400 },
			);
		}

		// Validate currency
		if (!currency || typeof currency !== "string") {
			return NextResponse.json(
				{ success: false, message: "Currency is required." },
				{ status: 400 },
			);
		}

		// Create Stripe PaymentIntent
		const paymentIntent = await stripe.paymentIntents.create({
			customer: stripeCustomerId || undefined,
			amount: Math.round(total * 100), // Convert to cents
			currency: currency.toLowerCase(),
			automatic_payment_methods: { enabled: true },
			// Include orderId and storeId in metadata for webhook processing
			metadata: {
				...(orderId && { orderId }),
				...(storeId && { storeId }),
			},
		});

		logger.info("Stripe payment intent created", {
			metadata: {
				paymentIntentId: paymentIntent.id,
				amount: paymentIntent.amount,
				currency: paymentIntent.currency,
			},
			tags: ["payment", "stripe", "api"],
		});

		return NextResponse.json(paymentIntent);
	} catch (error) {
		logger.error("Failed to create Stripe payment intent", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			},
			tags: ["payment", "stripe", "error", "api"],
		});

		return NextResponse.json(
			{
				success: false,
				message: "Failed to create payment intent. Please try again.",
			},
			{ status: 500 },
		);
	}
}
