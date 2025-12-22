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

	const order = (await getOrderById(params.orderId)) as StoreOrder;
	if (!order) {
		throw new Error("order not found");
	}

	const confirmed = (await confirmSubscriptionPayment(
		order.id,
		searchParams.payment_intent,
		searchParams.payment_intent_client_secret,
	)) as boolean;

	logger.info("confirmed");

	if (confirmed) {
		return (
			<Container>
				<SuccessAndRedirect order={order} />
			</Container>
		);
	}

	return (
		<Container>Error: Payment confirmation failed. Please try again.</Container>
	);
}
