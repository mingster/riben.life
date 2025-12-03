import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { sqlClient } from "@/lib/prismadb";
import { OrderStatus } from "@/types/enum";
import { getUtcNow } from "@/utils/datetime-utils";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

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
				updatedAt: getUtcNowEpoch(),
			},
		});

		return NextResponse.json("success", { status: 200 });
	} catch (error) {
		logger.info("order mark as completed", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
