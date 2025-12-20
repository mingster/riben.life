"use server";
import Container from "@/components/ui/container";
import confirmSubscriptionPayment from "@/actions/storeAdmin/subscription/stripe/confirm-payment";
import { SuccessAndRedirect } from "./SuccessAndRedirect";
import logger from "@/lib/logger";

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

	const confirmed = (await confirmSubscriptionPayment(
		params.orderId,
		searchParams.payment_intent,
		searchParams.payment_intent_client_secret,
	)) as boolean;

	logger.info("confirmed");

	if (confirmed) {
		return (
			<Container>
				<SuccessAndRedirect orderId={params.orderId} />
			</Container>
		);
	}

	return (
		<Container>Error: Payment confirmation failed. Please try again.</Container>
	);
}
