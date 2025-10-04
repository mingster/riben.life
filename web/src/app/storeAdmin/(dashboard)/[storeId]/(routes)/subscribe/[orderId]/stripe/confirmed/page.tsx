"use server";
import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";

import confirmPayment from "@/actions/storeAdmin/subscription/stripe/confirm-payment";
import { Suspense } from "react";
import { SuccessAndRedirect } from "./SuccessAndRedirect";

// this page is triggered when stripe confirmed the payment.
// here we mark the SubscriptionPayment as paid, activate the subscription, and show customer a message.
export default async function StripeConfirmedPage(props: {
	params: Promise<{ orderId: string }>;
	searchParams: Promise<{
		payment_intent: string;
		payment_intent_client_secret: string;
	}>;
}) {
	const searchParams = await props.searchParams;
	const params = await props.params;

	if (process.env.NODE_ENV === "development") {
		console.log("orderid", params.orderId);
		console.log("payment_intent", searchParams.payment_intent);
		console.log(
			"payment_intent_client_secret",
			searchParams.payment_intent_client_secret,
		);
	}

	const confirmed = (await confirmPayment(
		params.orderId,
		searchParams.payment_intent,
		searchParams.payment_intent_client_secret,
	)) as boolean;

	console.log("confirmed", confirmed);

	if (confirmed) {
		return (
			<Suspense fallback={<Loader />}>
				<Container>
					<SuccessAndRedirect orderId={"12345"} />
				</Container>
			</Suspense>
		);
	}

	return "error, please try again";
}
