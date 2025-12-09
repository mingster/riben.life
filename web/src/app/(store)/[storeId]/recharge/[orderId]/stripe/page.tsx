import { redirect } from "next/navigation";
import { Suspense } from "react";
import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import { PaymentStripe } from "./components/payment-stripe";
import getOrderById from "@/actions/get-order-by_id";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { StoreOrder } from "@/types";

type Params = Promise<{ storeId: string; orderId: string }>;

/**
 * Stripe payment page for credit recharge.
 * Server component that fetches order and passes to client component.
 */
export default async function RechargeStripePage(props: { params: Params }) {
	const params = await props.params;

	// Check authentication
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user?.id) {
		redirect(`/${params.storeId}?signin=true`);
	}

	// Get order
	const order = await getOrderById(params.orderId);

	if (!order) {
		redirect(`/${params.storeId}/recharge`);
	}

	// Verify order belongs to user
	if (order.userId !== session.user.id) {
		redirect(`/${params.storeId}/recharge`);
	}

	// Verify order belongs to store
	if (order.storeId !== params.storeId) {
		redirect(`/${params.storeId}/recharge`);
	}

	// If already paid, redirect to success
	if (order.isPaid) {
		redirect(`/${params.storeId}/recharge/${params.orderId}/success`);
	}

	transformPrismaDataForJson(order);

	return (
		<Container>
			<Suspense fallback={<Loader />}>
				<PaymentStripe order={order as StoreOrder} storeId={params.storeId} />
			</Suspense>
		</Container>
	);
}
