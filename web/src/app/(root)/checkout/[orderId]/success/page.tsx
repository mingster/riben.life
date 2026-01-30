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
 * Generic success page for all order types (regular orders, refill, RSVP prepaid, etc.)
 * Handles RSVP redirect logic for refill orders linked to reservations.
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

	// Determine the redirect URL based on order type and context
	let finalReturnUrl: string | undefined = returnUrl;

	// Check if this order was for an RSVP prepaid payment (via refill)
	// This handles the case where a customer refills credit to pay for an RSVP
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
	// Priority: RSVP redirect > returnUrl > default order page
	if (rsvpId && order.isPaid) {
		const rsvp = await sqlClient.rsvp.findUnique({
			where: { id: rsvpId },
			select: {
				id: true,
				storeId: true,
				alreadyPaid: true,
			},
		});

		// If RSVP exists, belongs to the same store, and is already paid, redirect to reservation history
		if (rsvp && rsvp.storeId === order.storeId && rsvp.alreadyPaid) {
			finalReturnUrl = `/s/${order.storeId}/reservation/history`;
		}
	}

	// If returnUrl is null and order is for RSVP, set returnUrl to store's reservation history
	if (!finalReturnUrl && order.pickupCode?.startsWith("RSVP:")) {
		finalReturnUrl = `/s/${order.storeId}/reservation/history`;
	}

	// Fetch RSVP if order is for RSVP (to update localStorage for anonymous users)
	let rsvp = null;
	if (order.isPaid && order.pickupCode?.startsWith("RSVP:")) {
		// Find RSVP by orderId
		const foundRsvp = await sqlClient.rsvp.findFirst({
			where: { orderId: order.id },
			include: {
				Store: true,
				Customer: true,
				CreatedBy: true,
				Facility: true,
				Order: true,
			},
		});

		if (foundRsvp) {
			transformPrismaDataForJson(foundRsvp);
			rsvp = foundRsvp;
		}
	}

	transformPrismaDataForJson(order);

	// Show success message briefly, then redirect
	// SuccessAndRedirect component handles the 3-second delay and redirect
	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<SuccessAndRedirect
					order={order}
					returnUrl={finalReturnUrl}
					rsvp={rsvp}
				/>
			</Container>
		</Suspense>
	);
}
