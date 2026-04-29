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
import { StoreLevel } from "@/types/enum";
import type { StoreOrder } from "@/types";

/**
 * Cash / in-person payment instructions after the customer selects cash at checkout.
 */
export default async function CheckoutCashPage(props: {
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

	const storeLevel = order.Store?.level ?? StoreLevel.Free;
	if (storeLevel === StoreLevel.Free) {
		logger.warn("Cash checkout not allowed for store tier", {
			metadata: { orderId: order.id, storeId: order.storeId },
			tags: ["payment", "cash", "checkout"],
		});
		notFound();
	}

	const resolved = await resolveShopCheckoutPayment(order.storeId, "cash");
	if (!resolved.ok) {
		logger.warn("Cash checkout not available", {
			metadata: {
				orderId: order.id,
				storeId: order.storeId,
				code: resolved.code,
			},
			tags: ["payment", "cash", "checkout"],
		});
		notFound();
	}

	const updateResult = await updateOrderPaymentMethodAction({
		orderId: order.id,
		paymentMethodId: resolved.paymentMethod.id,
	});

	if (updateResult?.serverError) {
		logger.error("Failed to set order payment method to cash", {
			metadata: {
				orderId: order.id,
				error: updateResult.serverError,
			},
			tags: ["payment", "cash", "error"],
		});
		notFound();
	}

	const { t, lng } = await getT(undefined, "translation");
	const store = order.Store;
	const storeName = (store?.name ?? "").trim() || "—";
	const orderRef =
		order.orderNum != null && order.orderNum > 0
			? String(order.orderNum)
			: order.id;

	return (
		<div className="px-3 pt-10 sm:px-5">
			<Container>
				<Card className="mx-auto max-w-lg">
					<CardHeader>
						<CardTitle>{t("checkout_cash_title")}</CardTitle>
						<CardDescription>{t("checkout_cash_description")}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<dl className="space-y-2 text-sm">
								<div className="flex justify-between gap-4">
									<dt className="text-muted-foreground">
										{t("checkout_cash_store")}
									</dt>
									<dd className="text-right font-medium">{storeName}</dd>
								</div>
								<div className="flex justify-between gap-4">
									<dt className="text-muted-foreground">
										{t("checkout_cash_order_ref")}
									</dt>
									<dd className="font-mono text-right">{orderRef}</dd>
								</div>
							</dl>
						</div>
						<div className="flex items-center justify-between border-t pt-4">
							<span className="text-sm font-medium">
								{t("checkout_cash_amount_due")}
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
