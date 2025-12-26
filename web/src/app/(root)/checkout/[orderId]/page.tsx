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

	// First, remove credit payment method from the list (we'll add it back if customer has balance)
	paymentMethods = paymentMethods.filter(
		(mapping) => mapping.PaymentMethod.payUrl !== "credit",
	);

	// Add credit payment method if customer has balance
	if (order.userId && order.userId !== "") {
		const customerCredit = await sqlClient.customerCredit.findUnique({
			where: {
				storeId_userId: {
					storeId,
					userId: order.userId,
				},
			},
		});

		const creditBalance = customerCredit ? Number(customerCredit.fiat) : 0;
		const orderTotal = Number(order.orderTotal) || 0;

		// Add credit payment method if customer has balance
		if (creditBalance > 0) {
			// Format currency using order's currency
			const currency = order.currency?.toUpperCase() || "TWD";
			const currencyFormatter = new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: currency,
				maximumFractionDigits: 0,
				minimumFractionDigits: 0,
			});
			const formattedBalance = currencyFormatter.format(creditBalance);

			// Check if balance is sufficient for the order
			const hasEnoughBalance = creditBalance >= orderTotal;

			// Find credit payment method
			const creditPaymentMethod = await sqlClient.paymentMethod.findFirst({
				where: {
					payUrl: "credit",
					isDeleted: false,
					visibleToCustomer: true,
				},
			});

			if (creditPaymentMethod) {
				// Check if store has a mapping for credit payment method
				const storeCreditMapping =
					await sqlClient.storePaymentMethodMapping.findFirst({
						where: {
							storeId,
							methodId: creditPaymentMethod.id,
						},
						include: {
							PaymentMethod: true,
						},
					});

				if (storeCreditMapping) {
					// Use store mapping if it exists, but override display name to include balance
					const baseName =
						storeCreditMapping.paymentDisplayName || creditPaymentMethod.name;
					paymentMethods.push({
						...storeCreditMapping,
						paymentDisplayName: `${baseName} (${formattedBalance})`,
						disabled: !hasEnoughBalance,
					} as StorePaymentMethodMapping & { disabled?: boolean });
				} else {
					// Add credit payment method without store mapping, include balance in display name
					paymentMethods.push({
						id: "",
						storeId,
						methodId: creditPaymentMethod.id,
						paymentDisplayName: `${creditPaymentMethod.name} (${formattedBalance})`,
						PaymentMethod: creditPaymentMethod,
						disabled: !hasEnoughBalance,
					} as StorePaymentMethodMapping & { disabled?: boolean });
				}
			}
		}
	}

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
							hideContactSeller={true}
							showOrderNotes={false}
							showPickupCode={false}
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
