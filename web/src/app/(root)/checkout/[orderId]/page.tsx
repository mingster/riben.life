import type { PaymentMethod } from "@prisma/client";
import { Suspense } from "react";
import getOrderById from "@/actions/get-order-by_id";
import { DisplayOrder } from "@/components/display-order";
import { Loader } from "@/components/loader";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import type { StoreOrder, StorePaymentMethodMapping } from "@/types";
import { transformPrismaDataForJson } from "@/utils/utils";
import { CheckoutPaymentMethods } from "./components/checkout-payment-methods";

type Params = Promise<{ orderId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const ONLINE_CHECKOUT_PAY_URLS = new Set(["stripe", "linepay"]);

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
		return (
			<Suspense fallback={<Loader />}>
				<Container>
					<SuccessAndRedirect order={order} returnUrl={returnUrl} />
				</Container>
			</Suspense>
		);
	}

	const storeId = order.storeId;
	const storePaymentMethods =
		await sqlClient.storePaymentMethodMapping.findMany({
			where: {
				storeId,
				PaymentMethod: {
					isDeleted: false,
					visibleToCustomer: true,
					payUrl: { in: [...ONLINE_CHECKOUT_PAY_URLS] },
				},
			},
			include: {
				PaymentMethod: true,
			},
		});

	let paymentMethods: StorePaymentMethodMapping[] = storePaymentMethods.filter(
		(m) => ONLINE_CHECKOUT_PAY_URLS.has(m.PaymentMethod.payUrl),
	);

	if (paymentMethods.length === 0) {
		const defaultPaymentMethods = await sqlClient.paymentMethod.findMany({
			where: {
				isDefault: true,
				isDeleted: false,
				visibleToCustomer: true,
				payUrl: { in: [...ONLINE_CHECKOUT_PAY_URLS] },
			},
		});

		paymentMethods = defaultPaymentMethods.map((method: PaymentMethod) => ({
			id: "",
			storeId,
			methodId: method.id,
			paymentDisplayName: null,
			PaymentMethod: method,
		})) as StorePaymentMethodMapping[];
	}

	paymentMethods = paymentMethods.filter(
		(mapping) => mapping.PaymentMethod.payUrl !== "TBD",
	);

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

	transformPrismaDataForJson(order);
	transformPrismaDataForJson(paymentMethods);

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
						paymentMethods={paymentMethods}
						returnUrl={returnUrl}
					/>
				</div>
			</Container>
		</Suspense>
	);
};

export default CheckoutHomePage;
