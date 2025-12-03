import { sqlClient } from "@/lib/prismadb";
import { OrderStatus } from "@/types/enum";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { StoreOrder } from "@prisma/client";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import logger from "@/lib/logger";

// get orders in in-shipping status in the store.
export async function GET(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	//try {
	CheckStoreAdminApiAccess(params.storeId);

	const store = await sqlClient.store.findUnique({
		where: {
			id: params.storeId,
		},
	});

	if (!store) {
		return new NextResponse("store not found", { status: 404 });
	}

	// if auto accept order, filter by both pending and processing; else filter by pending
	const filter = store.autoAcceptOrder
		? {
				orderStatus: {
					in: [OrderStatus.InShipping],
				},
			}
		: {
				orderStatus: {
					in: [OrderStatus.InShipping],
				},
			};

	// if requirePrepaid, filter order by requirePrepaid
	const filter2 = store.requirePrepaid
		? {
				isPaid: true,
			}
		: {
				OR: [
					{
						isPaid: true,
					},
					{
						isPaid: false,
					},
				],
			};

	const result = (await sqlClient.storeOrder.findMany({
		where: {
			storeId: params.storeId,
			...filter,
			...filter2,
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

	transformPrismaDataForJson(result);

	//console.log("awaiting4ProcessOrders", JSON.stringify(awaiting4ProcessOrders));
	return NextResponse.json(result);

	/*} catch (error) {
    logger.error("get pending orders", {
    	metadata: {
    		error: error instanceof Error ? error.message : String(error),
    	},
    	tags: ["api", "error"],
    });
    return new NextResponse("Internal error", { status: 500 });
  }*/
}
