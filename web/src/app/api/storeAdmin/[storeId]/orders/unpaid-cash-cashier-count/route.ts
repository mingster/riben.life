import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { sqlClient } from "@/lib/prismadb";
import { OrderStatus } from "@/types/enum";

/**
 * Count of unpaid orders shown on cash cashier / sidebar badge (same filter as get-unpaid-orders).
 */
export async function GET(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	const access = await CheckStoreAdminApiAccess(params.storeId);
	if (access instanceof Response) {
		return access;
	}

	const count = await sqlClient.storeOrder.count({
		where: {
			storeId: params.storeId,
			isPaid: false,
			orderStatus: {
				not: {
					in: [OrderStatus.Voided, OrderStatus.Refunded],
				},
			},
		},
	});

	return NextResponse.json({ count });
}
