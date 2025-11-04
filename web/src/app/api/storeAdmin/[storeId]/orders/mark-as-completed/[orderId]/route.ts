import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { sqlClient } from "@/lib/prismadb";
import { OrderStatus } from "@/types/enum";
import { getNowTimeInTz, getUtcNow } from "@/utils/datetime-utils";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

///!SECTION mark pending or processing order as completed
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

		const store = await sqlClient.store.findUnique({
			where: {
				id: params.storeId,
			},
		});

		if (!store) {
			return NextResponse.json(
				{ success: false, message: "store not found." },
				{ status: 409 },
			);
		}

		const orderToUpdate = await sqlClient.storeOrder.findUnique({
			where: {
				id: params.orderId,
			},
		});
		if (orderToUpdate === null) {
			return new NextResponse("order not found", { status: 500 });
		}

		/*
    const ship = await sqlClient.shippingMethod.findUnique({
      where: {
        id: orderToUpdate.shippingMethodId,
      },
    });

    // if physical shipping NOT required, mark order status as completed
    if (ship?.shipRequried) {
      await sqlClient.storeOrder.update({
        where: {
          id: params.orderId,
        },
        data: {
          orderStatus: OrderStatus.Completed,
        },
      });
    } else {
      await sqlClient.storeOrder.update({
        where: {
          id: params.orderId,
        },
        data: {
          orderStatus: OrderStatus.InShipping,
        },
      });
    }
*/

		await sqlClient.storeOrder.update({
			where: {
				id: params.orderId,
			},
			data: {
				orderStatus: OrderStatus.Completed,
				// store time in store's local timezone
				updatedAt: getNowTimeInTz(store.defaultTimezone),
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
