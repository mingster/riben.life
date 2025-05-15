import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/utils/utils";
import { OrderStatus } from "@/types/enum";
import type { StoreOrder } from "@prisma/client";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";

// get unpaid orders in the store.
export async function GET(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		const unpaidOrders = (await sqlClient.storeOrder.findMany({
			where: {
				storeId: params.storeId,
				isPaid: false,
				orderStatus: {
					not: {
						in: [OrderStatus.Voided, OrderStatus.Refunded],
					},
				},
				/*
        orderStatus: {
          in: [OrderStatus.Pending, OrderStatus.Processing],
        },*/
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

		transformDecimalsToNumbers(unpaidOrders);

		//console.log("awaiting4ProcessOrders", JSON.stringify(awaiting4ProcessOrders));
		return NextResponse.json(unpaidOrders);
	} catch (error) {
		console.error("[GET_UNPAID_ORDERS]", error);

		return new NextResponse("Internal error", { status: 500 });
	}
}
