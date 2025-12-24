import { Suspense } from "react";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import getOrderById from "@/actions/get-order-by_id";
import { DisplayOrder } from "@/components/display-order";
import { CheckoutPaymentMethods } from "./components/checkout-payment-methods";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import { transformPrismaDataForJson } from "@/utils/utils";
import { sqlClient } from "@/lib/prismadb";
import type { StoreOrder, StorePaymentMethodMapping } from "@/types";
import type { PaymentMethod } from "@prisma/client";

type Params = Promise<{ orderId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * Store order checkout page.
 * 1. Display the store order for customer to pay.
 * 2. Display payment methods
 * 3. Redirect to payment provider
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

	// Fetch order with all relations
	const order = (await getOrderById(params.orderId)) as StoreOrder;

	if (!order) {
		throw new Error("Order not found");
	}

	// If order is already paid, redirect to success page
	if (order.isPaid) {
		return (
			<Suspense fallback={<Loader />}>
				<Container>
					<SuccessAndRedirect order={order} />
				</Container>
			</Suspense>
		);
	}

	// Get store payment methods
	const storeId = order.storeId;
	const storePaymentMethods =
		await sqlClient.storePaymentMethodMapping.findMany({
			where: {
				storeId,
				PaymentMethod: {
					isDeleted: false,
					visibleToCustomer: true, // Only show methods visible to customers
				},
			},
			include: {
				PaymentMethod: true,
			},
		});

	// If store has no payment methods, add default payment methods
	let paymentMethods: StorePaymentMethodMapping[] = storePaymentMethods;

	if (paymentMethods.length === 0) {
		const defaultPaymentMethods = await sqlClient.paymentMethod.findMany({
			where: {
				isDefault: true,
				isDeleted: false,
				visibleToCustomer: true,
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

	// Filter out "TBD" payment method (used for admin-created orders)
	paymentMethods = paymentMethods.filter(
		(mapping) => mapping.PaymentMethod.payUrl !== "TBD",
	);

	// If no payment methods available after filtering, show error
	if (paymentMethods.length === 0) {
		return (
			<Container>
				<div className="p-4">
					<div className="text-lg font-medium mb-4">
						No payment methods available
					</div>
					<DisplayOrder order={order} />
				</div>
			</Container>
		);
	}

	// Transform order data for JSON serialization
	transformPrismaDataForJson(order);
	transformPrismaDataForJson(paymentMethods);

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<div className="px-2 py-4">
					<div className="text-lg font-medium mb-4">
						{/* Order display */}
						<DisplayOrder
							order={order}
							hidePaymentMethod={true}
							hideOrderStatus={true}
						/>
					</div>

					{/* Payment method selection */}
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
