import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getT } from "@/app/i18n";
import { ShopPurchaseAnalytics } from "@/components/shop/shop-purchase-analytics";
import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { markShopOrderPaidAndNotify } from "@/lib/shop/finalize-shop-order-payment";
import { stripe } from "@/lib/payment/stripe/config";
import { ClearCartOnSuccess } from "./success-client";

type Params = Promise<{ storeId: string }>;

interface PageProps {
	params: Params;
	searchParams: Promise<{
		session_id?: string;
		linepay?: string;
		paypal?: string;
		order_id?: string;
	}>;
}

export default async function ShopCheckoutSuccessPage(props: PageProps) {
	const { storeId } = await props.params;
	const sp = await props.searchParams;
	const { t } = await getT(undefined, "shop");

	const orderIdParam = sp.order_id;
	const externalPaid =
		(sp.linepay === "1" || sp.paypal === "1") && orderIdParam;

	if (externalPaid) {
		const session = await auth.api.getSession({ headers: await headers() });
		if (!session?.user?.id) {
			const q = new URLSearchParams();
			if (sp.linepay === "1") {
				q.set("linepay", "1");
			}
			if (sp.paypal === "1") {
				q.set("paypal", "1");
			}
			q.set("order_id", orderIdParam);
			redirect(
				`/signIn?callbackUrl=${encodeURIComponent(`/shop/${storeId}/checkout/success?${q.toString()}`)}`,
			);
		}

		const order = await sqlClient.storeOrder.findFirst({
			where: {
				id: orderIdParam,
				userId: session.user.id,
				storeId,
			},
			select: { id: true, isPaid: true, orderTotal: true, currency: true },
		});

		if (!order?.isPaid) {
			redirect(`/shop/${storeId}/cart`);
		}

		return (
			<div className="mx-auto max-w-md space-y-6 text-center">
				<ShopPurchaseAnalytics
					orderId={order.id}
					value={Number(order.orderTotal)}
					currency={order.currency}
				/>
				<ClearCartOnSuccess />
				<h1 className=" text-2xl font-light tracking-tight">
					{t("shop_checkout_thank_you")}
				</h1>
				<p className="text-sm text-muted-foreground">
					{t("shop_checkout_received")}
				</p>
				<p className="font-mono text-xs text-muted-foreground">
					{t("shop_checkout_order_id", { id: order.id })}
				</p>
				<div className="flex flex-wrap justify-center gap-3">
					<Link
						href={`/account/orders/${order.id}`}
						className="text-sm font-medium underline underline-offset-4"
					>
						{t("shop_checkout_view_order")}
					</Link>
					<Link
						href="/account?tab=orders"
						className="text-sm text-muted-foreground underline underline-offset-4"
					>
						{t("shop_checkout_all_orders")}
					</Link>
					<Link
						href={`/shop/${storeId}`}
						className="text-sm text-muted-foreground underline underline-offset-4"
					>
						{t("shop_checkout_continue_shopping")}
					</Link>
				</div>
			</div>
		);
	}

	const sessionId = sp.session_id;

	if (!sessionId) {
		redirect(`/shop/${storeId}/cart`);
	}

	let checkoutSession: Awaited<
		ReturnType<typeof stripe.checkout.sessions.retrieve>
	>;
	try {
		checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
	} catch {
		redirect(`/shop/${storeId}/cart`);
	}

	if (checkoutSession.payment_status !== "paid") {
		return (
			<div className="space-y-4 text-center">
				<p className="text-sm text-muted-foreground">
					{t("shop_checkout_payment_not_completed")}
				</p>
				<Link
					href={`/shop/${storeId}/cart`}
					className="text-sm underline underline-offset-4"
				>
					{t("shop_checkout_return_bag")}
				</Link>
			</div>
		);
	}

	const orderId = checkoutSession.metadata?.orderId;
	if (!orderId) {
		return (
			<div className="space-y-4 text-center">
				<p className="text-sm text-muted-foreground">
					{t("shop_checkout_missing_order_ref")}
				</p>
				<Link
					href={`/shop/${storeId}`}
					className="text-sm underline underline-offset-4"
				>
					{t("shop_checkout_continue_shopping")}
				</Link>
			</div>
		);
	}

	const order = await sqlClient.storeOrder.findUnique({
		where: { id: orderId },
		select: {
			id: true,
			isPaid: true,
			orderTotal: true,
			currency: true,
			storeId: true,
		},
	});

	if (!order || order.storeId !== storeId) {
		redirect(`/shop/${storeId}/cart`);
	}

	await markShopOrderPaidAndNotify(orderId, checkoutSession.id);

	return (
		<div className="mx-auto max-w-md space-y-6 text-center">
			<ShopPurchaseAnalytics
				orderId={orderId}
				value={Number(order.orderTotal)}
				currency={order.currency}
			/>
			<ClearCartOnSuccess />
			<h1 className=" text-2xl font-light tracking-tight">
				{t("shop_checkout_thank_you")}
			</h1>
			<p className="text-sm text-muted-foreground">
				{t("shop_checkout_received")}
			</p>
			<p className="font-mono text-xs text-muted-foreground">
				{t("shop_checkout_order_id", { id: orderId })}
			</p>
			<div className="flex flex-wrap justify-center gap-3">
				<Link
					href={`/account/orders/${orderId}`}
					className="text-sm font-medium underline underline-offset-4"
				>
					{t("shop_checkout_view_order")}
				</Link>
				<Link
					href="/account?tab=orders"
					className="text-sm text-muted-foreground underline underline-offset-4"
				>
					{t("shop_checkout_all_orders")}
				</Link>
				<Link
					href={`/shop/${storeId}`}
					className="text-sm text-muted-foreground underline underline-offset-4"
				>
					{t("shop_checkout_continue_shopping")}
				</Link>
			</div>
		</div>
	);
}
