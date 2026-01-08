import getOrderById from "@/actions/get-order-by_id";
import getStoreById from "@/actions/get-store-by_id";
import { sqlClient } from "@/lib/prismadb";
import type { Store, Rsvp } from "@/types";
import { transformPrismaDataForJson } from "@/utils/utils";
import { DisplayClient } from "./client";

type Params = Promise<{ storeId: string; orderId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreOrderStatusPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Get order first to get storeId
	const order = await getOrderById(params.orderId);

	if (!order) {
		return <div>Order not found</div>;
	}

	// Fetch store after we have the storeId
	const store = (await getStoreById(order.storeId)) as Store;

	// Check if this is an RSVP order and fetch RSVP if it exists
	let rsvp: Rsvp | null = null;
	if (order.pickupCode?.startsWith("RSVP:")) {
		const foundRsvp = await sqlClient.rsvp.findFirst({
			where: { orderId: order.id },
			include: {
				Store: true,
			},
		});

		if (foundRsvp) {
			transformPrismaDataForJson(foundRsvp);
			rsvp = foundRsvp as Rsvp;
		}
	}

	return <DisplayClient store={store} order={order} rsvp={rsvp} />;
}
