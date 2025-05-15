import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/utils/utils";
import { OrderStatus } from "@/types/enum";
import type { StoreOrder } from "@prisma/client";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";

// get pending and processing orders in the store.
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
					in: [
						OrderStatus.Pending,
						OrderStatus.Processing,
						//OrderStatus.InShipping,
					],
				},
			}
		: {
				orderStatus: {
					in: [OrderStatus.Processing],
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

	const awaiting4ProcessOrders = (await sqlClient.storeOrder.findMany({
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

	transformDecimalsToNumbers(awaiting4ProcessOrders);

	//console.log("awaiting4ProcessOrders", JSON.stringify(awaiting4ProcessOrders));
	return NextResponse.json(awaiting4ProcessOrders);

	/*} catch (error) {
    console.error("[GET_PENDING_ORDERS]", error);
    return new NextResponse("Internal error", { status: 500 });
  }*/
}
