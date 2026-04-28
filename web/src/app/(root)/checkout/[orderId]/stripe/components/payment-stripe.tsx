"use client";

import {
	Elements,
	LinkAuthenticationElement,
	PaymentElement,
	useElements,
	useStripe,
} from "@stripe/react-stripe-js";
import type { Appearance, StripeElementsOptions } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { navigateAfterCheckout } from "@/utils/checkout-post-payment-navigate";
import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import type { CustomSessionUser } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";
import logger from "@/lib/logger";
import {
	formatInternalMinorForDisplay,
	majorUnitsToInternalMinor,
} from "@/lib/payment/stripe/stripe-money";
import getStripe from "@/lib/payment/stripe/client";
import { appLngToStripeElementsLocale } from "@/lib/payment/stripe/elements-locale";
import { useI18n } from "@/providers/i18n-provider";
import type { StoreOrder } from "@/types";
import { getAbsoluteUrl } from "@/utils/utils";

type paymentProps = {
	order: StoreOrder;
	returnUrl?: string;
};

const PaymentStripe: React.FC<paymentProps> = ({ order, returnUrl }) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "payment-stripe");

	if (!order.id) throw Error("order is required.");
	if (Number.isNaN(Number(order.orderTotal)))
		throw Error("orderTotal must be a number.");

	if (Number(order.orderTotal) <= 0)
		throw Error("orderTotal should greater than zero.");

	const [clientSecret, setClientSecret] = useState("");

	useEffect(() => {
		if (order.isPaid) return;

		const url = "/api/payment/stripe/create-payment-intent";
		const body = JSON.stringify({
			total: majorUnitsToInternalMinor(Number(order.orderTotal)),
			currency: order.currency,
			orderId: order.id,
			storeId: order.storeId,
			savePaymentMethod: false,
		});

		fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body,
		})
			.then((res) => res.json())
			.then((data) => {
				if (data?.client_secret) {
					setClientSecret(data.client_secret as string);
				} else {
					logger.error("Stripe create-payment-intent missing client_secret", {
						metadata: { orderId: order.id },
						tags: ["payment", "stripe", "error"],
					});
				}
			})
			.catch((err: unknown) => {
				logger.error("Stripe create-payment-intent failed", {
					metadata: {
						orderId: order.id,
						error: err instanceof Error ? err.message : String(err),
					},
					tags: ["payment", "stripe", "error"],
				});
			});
	}, [order]);

	const { data: session } = authClient.useSession();

	const sessionUser = session?.user as CustomSessionUser | undefined;
	const email = sessionUser?.email ?? "";
	const name = sessionUser?.name ?? "";

	const stripeElementsLocale = appLngToStripeElementsLocale(lng);

	const { resolvedTheme } = useTheme();
	const appearance: Appearance = {
		theme: resolvedTheme === "light" ? "flat" : "night",
	};

	const options: StripeElementsOptions = {
		clientSecret: clientSecret,
		appearance,
		locale: stripeElementsLocale,
	};
	const stripePromise = getStripe();

	const router = useRouter();

	useEffect(() => {
		if (!order.isPaid) return;
		navigateAfterCheckout(router, {
			orderId: order.id,
			order: { userId: order.userId, storeId: order.storeId },
			returnUrl,
		});
	}, [
		order.isPaid,
		order.id,
		order.userId,
		order.storeId,
		returnUrl,
		router,
	]);

	if (order.isPaid) {
		return null;
	}

	return (
		clientSecret !== "" &&
		stripePromise !== null && (
			<Elements
				key={`${clientSecret}:${stripeElementsLocale}`}
				stripe={stripePromise}
				options={options}
			>
				<StripeFormElementsWrapper
					email={email}
					name={name}
					orderId={order.id}
					returnUrl={returnUrl}
				/>
				<div className="mt-4 text-sm text-muted-foreground">
					{t("payment_stripe_pay_amount")}{" "}
					{formatInternalMinorForDisplay(
						order.currency || "twd",
						majorUnitsToInternalMinor(Number(order.orderTotal)),
						lng === "tw" ? "zh-TW" : "en-US",
					)}
				</div>
			</Elements>
		)
	);
};

export default PaymentStripe;

const StripeFormElementsWrapper: React.FC<{
	email: string;
	name: string;
	orderId: string;
	returnUrl?: string;
}> = ({ email, name, orderId, returnUrl }) => {
	const [errorMessage, setErrorMessage] = useState<string | undefined>();

	const clearError = () => {
		setErrorMessage(undefined);
	};

	return (
		<>
			<LinkAuthenticationElement
				id="link-authentication-element"
				onChange={() => {
					clearError();
				}}
				options={{ defaultValues: { email } }}
			/>
			<PaymentElement
				id="payment-element"
				onChange={() => {
					clearError();
				}}
				options={{
					defaultValues: {
						billingDetails: {
							email,
							name,
						},
					},
				}}
			/>
			<StripePayButton
				orderId={orderId}
				returnUrl={returnUrl}
				errorMessage={errorMessage}
				setErrorMessage={setErrorMessage}
			/>
		</>
	);
};

const StripePayButton: React.FC<{
	orderId: string;
	returnUrl?: string;
	errorMessage?: string;
	setErrorMessage: (message: string | undefined) => void;
}> = ({
	orderId,
	returnUrl: customReturnUrl,
	errorMessage,
	setErrorMessage,
}) => {
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "payment-stripe");

	const elements = useElements();
	const stripe = useStripe();
	const [isProcessingPayment, setIsProcessingPayment] = useState(false);

	const confirmedPath = `/checkout/${orderId}/stripe/confirmed`;
	const stripeReturnUrl = customReturnUrl
		? `${getAbsoluteUrl()}${confirmedPath}?returnUrl=${encodeURIComponent(customReturnUrl)}`
		: `${getAbsoluteUrl()}${confirmedPath}`;

	const fetchData = async () => {
		if (!stripe || !elements) {
			return;
		}

		const { error, paymentIntent } = await stripe.confirmPayment({
			elements,
			confirmParams: {
				return_url: stripeReturnUrl,
			},
			redirect: "if_required",
		});

		if (error) {
			setErrorMessage(error.message);
			logger.info("Stripe confirmPayment error", {
				metadata: {
					error: error.message,
				},
				tags: ["payment", "stripe"],
			});
			if (customReturnUrl) {
				router.push(`${customReturnUrl}?status=failed`);
			}
			return;
		}

		logger.info("payment confirmed");

		if (
			paymentIntent?.status === "succeeded" &&
			paymentIntent.client_secret
		) {
			const qs = new URLSearchParams({
				payment_intent: paymentIntent.id,
				payment_intent_client_secret: paymentIntent.client_secret,
				redirect_status: "succeeded",
			});
			if (customReturnUrl) {
				qs.set("returnUrl", customReturnUrl);
			}
			router.push(`${confirmedPath}?${qs.toString()}`);
			return;
		}

		router.push(customReturnUrl ? `${confirmedPath}?returnUrl=${encodeURIComponent(customReturnUrl)}` : confirmedPath);
	};

	const paymentHandler = async (e: React.SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();

		setIsProcessingPayment(true);

		await fetchData();

		setIsProcessingPayment(false);
	};

	return (
		<form onSubmit={paymentHandler} className="mt-4">
			{errorMessage && (
				<div className="bold mt-2 rounded-md bg-pink-100 p-2 text-pink-500">
					{errorMessage}
				</div>
			)}
			<Button
				disabled={isProcessingPayment}
				type="submit"
				className="h-10 w-full touch-manipulation disabled:opacity-25 sm:h-9 sm:min-h-0"
			>
				{t("payment_stripe_form_pay_button")}
			</Button>
		</form>
	);
};
