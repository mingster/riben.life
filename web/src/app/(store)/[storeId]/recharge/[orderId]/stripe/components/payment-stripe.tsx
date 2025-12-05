"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import {
	Elements,
	LinkAuthenticationElement,
	PaymentElement,
	useElements,
	useStripe,
} from "@stripe/react-stripe-js";
import type { Appearance, StripeElementsOptions } from "@stripe/stripe-js";
import { useTheme } from "next-themes";
import { authClient } from "@/lib/auth-client";
import getStripe from "@/lib/stripe/client";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/loader";
import logger from "@/lib/logger";
import { getAbsoluteUrl } from "@/utils/utils";
import type { StoreOrder } from "@/types";

interface PaymentStripeProps {
	order: StoreOrder;
	storeId: string;
}

/**
 * Stripe payment component for credit recharge.
 */
export function PaymentStripe({ order, storeId }: PaymentStripeProps) {
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "payment-stripe");
	const [clientSecret, setClientSecret] = useState("");
	const [isLoading, setIsLoading] = useState(true);

	// Create payment intent
	useEffect(() => {
		if (order.isPaid) {
			router.push(`/${storeId}/recharge/${order.id}/success`);
			return;
		}

		const createPaymentIntent = async () => {
			try {
				const url = `${process.env.NEXT_PUBLIC_API_URL}/payment/stripe/create-payment-intent`;
				const body = JSON.stringify({
					total: Number(order.orderTotal),
					currency: order.currency,
				});

				const response = await fetch(url, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: body,
				});

				if (!response.ok) {
					throw new Error("Failed to create payment intent");
				}

				const data = await response.json();
				setClientSecret(data.client_secret);
			} catch (error) {
				logger.error("Failed to create payment intent", {
					metadata: {
						error: error instanceof Error ? error.message : String(error),
					},
					tags: ["error", "payment"],
				});
			} finally {
				setIsLoading(false);
			}
		};

		createPaymentIntent();
	}, [order, storeId, router]);

	const { data: session } = authClient.useSession();
	const email = session?.user?.email || "";
	const name = session?.user?.name || "";

	const { resolvedTheme } = useTheme();
	const appearance: Appearance = {
		theme: resolvedTheme === "light" ? "flat" : "night",
	};

	const options: StripeElementsOptions = {
		clientSecret: clientSecret,
		appearance: appearance,
	};

	const stripePromise = getStripe();

	if (isLoading || !clientSecret) {
		return <Loader />;
	}

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold">Complete Payment</h1>
			<p className="text-muted-foreground">
				Pay {Number(order.orderTotal)} {order.currency.toUpperCase()} to recharge your credit
			</p>
			{stripePromise && (
				<Elements key={clientSecret} stripe={stripePromise} options={options}>
					<LinkAuthenticationElement
						id="link-authentication-element"
						options={{ defaultValues: { email } }}
					/>
					<PaymentElement
						id="payment-element"
						options={{
							defaultValues: {
								billingDetails: {
									email,
									name,
								},
							},
						}}
					/>
					<StripePayButton orderId={order.id} storeId={storeId} />
				</Elements>
			)}
		</div>
	);
}

const StripePayButton: React.FC<{ orderId: string; storeId: string }> = ({
	orderId,
	storeId,
}) => {
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "payment-stripe");
	const elements = useElements();
	const stripe = useStripe();
	const [isProcessingPayment, setIsProcessingPayment] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | undefined>();

	const returnUrl = `${getAbsoluteUrl()}/${storeId}/recharge/${orderId}/stripe/confirmed`;

	const handlePayment = async () => {
		if (!stripe || !elements) {
			return;
		}

		setIsProcessingPayment(true);

		const { error } = await stripe.confirmPayment({
			elements,
			confirmParams: {
				return_url: returnUrl,
			},
		});

		if (error) {
			setErrorMessage(error.message);
			logger.error("Payment confirmation error", {
				metadata: {
					error: error.message,
				},
				tags: ["error", "payment"],
			});
		} else {
			router.push(returnUrl);
		}

		setIsProcessingPayment(false);
	};

	return (
		<div className="space-y-4">
			{errorMessage && (
				<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
					{errorMessage}
				</div>
			)}
			<Button
				type="button"
				onClick={handlePayment}
				disabled={isProcessingPayment}
				className="w-full h-10 min-h-[44px] sm:h-9 sm:min-h-0"
			>
				{isProcessingPayment ? t("processing") : t("payment_stripeForm_payButton")}
			</Button>
		</div>
	);
};

