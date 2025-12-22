import { redirect } from "next/navigation";
import { sqlClient } from "@/lib/prismadb";
import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import { Suspense } from "react";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import { transformPrismaDataForJson } from "@/utils/utils";
import { StoreOrder } from "@/types";
import getOrderById from "@/actions/get-order-by_id";

type Params = Promise<{ orderId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * Generic success page for all order types (regular orders, recharge, RSVP prepaid, etc.)
 * Handles RSVP redirect logic for recharge orders linked to reservations.
 */
export default async function CheckoutSuccessPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const returnUrl =
		typeof searchParams.returnUrl === "string"
			? searchParams.returnUrl
			: undefined;

	const order = (await getOrderById(params.orderId)) as StoreOrder;
	if (!order) {
		throw new Error("order not found");
	}

	// Check if this order was for an RSVP prepaid payment (via recharge)
	// This handles the case where a customer recharges credit to pay for an RSVP
	let rsvpId: string | undefined;
	try {
		if (order.checkoutAttributes) {
			const parsed = JSON.parse(order.checkoutAttributes);
			rsvpId = parsed.rsvpId;
		}
	} catch {
		// If parsing fails, continue without rsvpId
	}

	// If rsvpId exists and order is paid, check if RSVP prepaid was processed
	if (rsvpId && order.isPaid) {
		const rsvp = await sqlClient.rsvp.findUnique({
			where: { id: rsvpId },
			select: {
				id: true,
				storeId: true,
				alreadyPaid: true,
			},
		});

		// If RSVP exists, belongs to the same store, and is already paid, redirect to reservation page
		if (rsvp && rsvp.storeId === order.storeId && rsvp.alreadyPaid) {
			redirect(`/s/${order.storeId}/reservation`);
		}
	}

	// If returnUrl is provided, redirect to it instead of showing success page
	if (returnUrl) {
		redirect(returnUrl);
	}

	transformPrismaDataForJson(order);

	// Use generic success component that redirects to order detail page
	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<SuccessAndRedirect order={order} />
			</Container>
		</Suspense>
	);
}
