import { Suspense } from "react";
import { notFound } from "next/navigation";
import getOrderById from "@/actions/get-order-by_id";
import { updateOrderPaymentMethodAction } from "@/actions/store/order/update-order-payment-method";
import { getT } from "@/app/i18n";
import Currency from "@/components/currency";
import { Loader } from "@/components/loader";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import Container from "@/components/ui/container";
import logger from "@/lib/logger";
import { resolveShopCheckoutPayment } from "@/lib/payment/resolve-shop-checkout-payment";
import { getPostPaymentSignInProps } from "@/lib/rsvp/get-post-payment-signin-props";
import type { StoreOrder } from "@/types";

/**
 * ATM bank transfer instructions after the customer selects ATM at checkout.
 */
export default async function CheckoutAtmPage(props: {
	params: Promise<{ orderId: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const params = await props.params;
	const searchParams = await props.searchParams;

	if (!params.orderId) {
		throw new Error("Order ID is missing");
	}

	const returnUrl =
		typeof searchParams.returnUrl === "string"
			? searchParams.returnUrl
			: undefined;

	const order = (await getOrderById(params.orderId)) as StoreOrder | null;
	if (!order) {
		notFound();
	}

	if (order.isPaid === true) {
		const { rsvp, postPaymentSignInToken } = await getPostPaymentSignInProps(
			order.id,
		);
		return (
			<Suspense fallback={<Loader />}>
				<Container>
					<SuccessAndRedirect
						order={order}
						returnUrl={returnUrl}
						rsvp={rsvp}
						postPaymentSignInToken={postPaymentSignInToken}
					/>
				</Container>
			</Suspense>
		);
	}

	const resolved = await resolveShopCheckoutPayment(order.storeId, "atm");
	if (!resolved.ok) {
		logger.warn("ATM checkout not available", {
			metadata: {
				orderId: order.id,
				storeId: order.storeId,
				code: resolved.code,
			},
			tags: ["payment", "atm", "checkout"],
		});
		notFound();
	}

	const updateResult = await updateOrderPaymentMethodAction({
		orderId: order.id,
		paymentMethodId: resolved.paymentMethod.id,
	});

	if (updateResult?.serverError) {
		logger.error("Failed to set order payment method to ATM", {
			metadata: {
				orderId: order.id,
				error: updateResult.serverError,
			},
			tags: ["payment", "atm", "error"],
		});
		notFound();
	}

	const { t, lng } = await getT(undefined, "translation");

	const store = order.Store;
	const bankCode = (store?.bankCode ?? "").trim();
	const bankAccount = (store?.bankAccount ?? "").trim();
	const bankAccountName = (store?.bankAccountName ?? "").trim();

	return (
		<div className="px-3 pt-10 sm:px-5">
			<Container>
				<Card className="mx-auto max-w-lg">
					<CardHeader>
						<CardTitle>{t("checkout_atm_title")}</CardTitle>
						<CardDescription>{t("checkout_atm_description")}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<p className="text-sm font-medium text-muted-foreground">
								{t("checkout_atm_transfer_details")}
							</p>
							<dl className="mt-2 space-y-2 text-sm">
								<div className="flex justify-between gap-4">
									<dt>{t("checkout_atm_bank_code")}</dt>
									<dd className="font-mono text-right">{bankCode || "—"}</dd>
								</div>
								<div className="flex justify-between gap-4">
									<dt>{t("checkout_atm_bank_account")}</dt>
									<dd className="font-mono text-right">{bankAccount || "—"}</dd>
								</div>
								<div className="flex justify-between gap-4">
									<dt>{t("checkout_atm_bank_account_name")}</dt>
									<dd className="text-right">{bankAccountName || "—"}</dd>
								</div>
							</dl>
						</div>
						<div className="flex items-center justify-between border-t pt-4">
							<span className="text-sm font-medium">
								{t("checkout_atm_order_total")}
							</span>
							<Currency
								value={order.orderTotal}
								currency={store?.defaultCurrency ?? "twd"}
								lng={lng}
								colored={false}
							/>
						</div>
					</CardContent>
				</Card>
			</Container>
		</div>
	);
}
