"use server";
import Container from "@/components/ui/container";
import confirmSubscriptionPayment from "@/actions/storeAdmin/subscription/stripe/confirm-payment";

import logger from "@/lib/logger";
import getOrderById from "@/actions/get-order-by_id";
import { StoreOrder } from "@/types";
import { SuccessAndRedirect } from "@/components/success-and-redirect";

// This page is triggered when Stripe confirms the payment.
// Marks the SubscriptionPayment as paid, activates the subscription, and shows confirmation.
export default async function StripeConfirmedPage(props: {
	params: Promise<{ storeId: string; orderId: string }>;
	searchParams: Promise<{
		payment_intent?: string;
		payment_intent_client_secret?: string;
	}>;
}) {
	const searchParams = await props.searchParams;
	const params = await props.params;

	if (process.env.NODE_ENV === "development") {
		logger.info("orderid");
		logger.info("payment_intent");
		console.log(
			"payment_intent_client_secret",
			searchParams.payment_intent_client_secret,
		);
	}

	if (
		!searchParams.payment_intent ||
		!searchParams.payment_intent_client_secret
	) {
		return (
			<Container>
				Error: Missing payment intent parameters. Please try again.
			</Container>
		);
	}

	// Try to get the order, but don't fail if it doesn't exist
	// For subscriptions, the orderId might be a subscriptionPayment ID, not a storeOrder ID
	let order: StoreOrder | null = null;
	try {
		order = (await getOrderById(params.orderId)) as StoreOrder;
	} catch (error) {
		logger.warn("Order not found, continuing with subscription payment confirmation", {
			metadata: {
				orderId: params.orderId,
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["subscription", "payment", "stripe"],
		});
	}

	const confirmed = (await confirmSubscriptionPayment(
		params.orderId,
		searchParams.payment_intent,
		searchParams.payment_intent_client_secret,
	)) as boolean;

	logger.info("Subscription payment confirmed", {
		metadata: {
			orderId: params.orderId,
			confirmed,
		},
		tags: ["subscription", "payment", "stripe"],
	});

	if (confirmed) {
		return (
			<Container>
				<SuccessAndRedirect order={order || undefined} orderId={params.orderId} />
			</Container>
		);
	}

	return (
		<Container>Error: Payment confirmation failed. Please try again.</Container>
	);
}
