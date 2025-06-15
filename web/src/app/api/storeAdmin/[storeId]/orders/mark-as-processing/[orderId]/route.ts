import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { sqlClient } from "@/lib/prismadb";
import { OrderStatus } from "@/types/enum";
import { getNowTimeInTz, getUtcNow } from "@/utils/utils";
import { NextResponse } from "next/server";

///!SECTION mark the pending order as Processing
export async function POST(
	_req: Request,
	props: { params: Promise<{ storeId: string; orderId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		if (!params.orderId) {
			return new NextResponse("orderId is required", { status: 403 });
		}

		const orderToUpdate = await sqlClient.storeOrder.findUnique({
			where: {
				id: params.orderId,
			},
		});
		if (orderToUpdate === null) {
			return new NextResponse("order not found", { status: 500 });
		}
		if (orderToUpdate.orderStatus !== OrderStatus.Pending) {
			return new NextResponse("order is not pending", { status: 501 });
		}

		const store = await sqlClient.store.findUnique({
			where: {
				id: params.storeId,
			},
		});

		if (store === null) {
			return new NextResponse("store not found", { status: 500 });
		}

		// update order
		await sqlClient.storeOrder.update({
			where: {
				id: params.orderId,
			},
			data: {
				orderStatus: OrderStatus.Processing,
				updatedAt: getNowTimeInTz(store.defaultTimezone),
			},
		});

		return NextResponse.json("success", { status: 200 });
	} catch (error) {
		console.log("[ORDER_MARK_AS_COMPLETED]", error);

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
