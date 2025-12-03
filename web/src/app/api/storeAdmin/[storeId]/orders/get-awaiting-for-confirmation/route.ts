import { sqlClient } from "@/lib/prismadb";
import { OrderStatus } from "@/types/enum";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { StoreOrder } from "@prisma/client";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import logger from "@/lib/logger";

// get pending orders in the store.
export async function GET(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		const awaitingOrders = (await sqlClient.storeOrder.findMany({
			where: {
				storeId: params.storeId,
				orderStatus: {
					in: [OrderStatus.Pending],
				},
			},
			include: {
				OrderNotes: true,
				OrderItemView: {
					include: {
						Product: true,
					},
				},
				User: true,
				ShippingMethod: true,
				PaymentMethod: true,
			},
			orderBy: {
				updatedAt: "desc",
			},
		})) as StoreOrder[];

		transformPrismaDataForJson(awaitingOrders);

		//console.log("awaitingOrders", JSON.stringify(awaitingOrders));

		return NextResponse.json(awaitingOrders);
	} catch (error) {
		logger.error("get pending orders", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api", "error"],
		});

		return new NextResponse("Internal error", { status: 500 });
	}
}
