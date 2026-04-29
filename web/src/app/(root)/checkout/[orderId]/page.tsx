import { Suspense } from "react";
import getOrderById from "@/actions/get-order-by_id";
import { DisplayOrder } from "@/components/display-order";
import { Loader } from "@/components/loader";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import { listShopCheckoutPaymentMethodRows } from "@/lib/payment/resolve-shop-checkout-payment";
import { sqlClient } from "@/lib/prismadb";
import { getPostPaymentSignInProps } from "@/lib/rsvp/get-post-payment-signin-props";
import Container from "@/components/ui/container";
import type { StoreOrder } from "@/types";
import { transformPrismaDataForJson } from "@/utils/utils";
import { CheckoutPaymentMethods } from "./components/checkout-payment-methods";

type Params = Promise<{ orderId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * Store order checkout: show order, pick Stripe or LINE Pay, route to provider.
 */
const CheckoutHomePage = async (props: {
	params: Params;
	searchParams: SearchParams;
}) => {
	const params = await props.params;
	const searchParams = await props.searchParams;

	if (!params.orderId) {
		throw new Error("Order ID is missing");
	}

	const returnUrl =
		typeof searchParams.returnUrl === "string"
			? searchParams.returnUrl
			: undefined;

	const order = (await getOrderById(params.orderId)) as StoreOrder;

	if (!order) {
		throw new Error("Order not found");
	}

	if (order.isPaid) {
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

	const storeId = order.storeId;
	const paymentMethods = await listShopCheckoutPaymentMethodRows(storeId);

	if (paymentMethods.length === 0) {
		return (
			<Container>
				<div className="p-4">
					<div className="mb-4 text-lg font-medium">
						No payment methods available
					</div>
					<DisplayOrder order={order} />
				</div>
			</Container>
		);
	}

	const cancelUrl =
		returnUrl ?? (order.userId ? "/account?tab=orders" : `/s/${storeId}`);

	transformPrismaDataForJson(order);
	transformPrismaDataForJson(paymentMethods);

	let customerFiatBalance: number | undefined;
	let customerCreditPoints: number | undefined;

	if (order.userId) {
		const customerCredit = await sqlClient.customerCredit.findUnique({
			where: { userId: order.userId },
			select: { fiat: true, point: true },
		});
		customerFiatBalance = customerCredit ? Number(customerCredit.fiat) : 0;
		customerCreditPoints = customerCredit ? Number(customerCredit.point) : 0;
	}

	const storeCurrency = order.Store?.defaultCurrency ?? null;

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<div className="px-2 py-4">
					<div className="mb-4 text-lg font-medium">
						<DisplayOrder
							order={order}
							hidePaymentMethod={true}
							hideOrderStatus={true}
							hideContactSeller={true}
							showOrderNotes={false}
							showPickupCode={false}
						/>
					</div>

					<CheckoutPaymentMethods
						orderId={order.id}
						paymentMethods={paymentMethods.map((method) => ({
							id: method.id,
							payUrl: method.payUrl,
							name: method.name,
						}))}
						customerFiatBalance={customerFiatBalance}
						customerCreditPoints={customerCreditPoints}
						storeCurrency={storeCurrency}
						returnUrl={returnUrl}
						cancelUrl={cancelUrl}
					/>
				</div>
			</Container>
		</Suspense>
	);
};

export default CheckoutHomePage;
