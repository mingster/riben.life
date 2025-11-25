import getOrderById from "@/actions/get-order-by_id";
import { sqlClient } from "@/lib/prismadb";
import type { StoreOrder } from "@/types";
import { OrderStatus } from "@/types/enum";
import logger from "@/lib/logger";
import { getNowTimeInTz } from "@/utils/datetime-utils";
import type { orderitemview } from "@prisma/client";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";

// mark order as deleted
export async function DELETE(
	_req: Request,
	props: { params: Promise<{ orderId: string; storeId: string }> },
) {
	const params = await props.params;
	//try {
	CheckStoreAdminApiAccess(params.storeId);

	if (!params.orderId) {
		return new NextResponse("orderId is required", { status: 400 });
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

	const order = await sqlClient.storeOrder.update({
		where: {
			id: params.orderId,
		},
		data: {
			orderStatus: OrderStatus.Voided,
			// store time in store's local timezone
			updatedAt: getNowTimeInTz(store.defaultTimezone),
		},
	});

	if (Number(order.orderTotal) === 0) {
		const order = await sqlClient.storeOrder.delete({
			where: {
				id: params.orderId,
			},
		});
		logger.info("order deleted", { metadata: { order } });
	}

	return NextResponse.json(order);
	/*} catch (error) {
    logger.info("product delete", {
    	metadata: {
    		error: error instanceof Error ? error.message : String(error),
    	},
    	tags: ["api"],
    });
    return new NextResponse("Internal error", { status: 500 });
  }*/
}

/// persist updated order in database
export async function PATCH(
	req: Request,
	props: { params: Promise<{ storeId: string; orderId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		if (!params.orderId) {
			return new NextResponse("orderId is required", { status: 400 });
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

		const updatedOrder = (await req.json()) as StoreOrder;

		await sqlClient.storeOrder.update({
			where: {
				id: params.orderId,
			},
			data: {
				paymentMethodId: updatedOrder.paymentMethodId,
				shippingMethodId: updatedOrder.shippingMethodId,
				facilityId: updatedOrder.facilityId,
				orderTotal: updatedOrder.orderTotal,

				// store time in store's local timezone
				updatedAt: getNowTimeInTz(store.defaultTimezone),
			},
		});

		await sqlClient.orderItem.deleteMany({
			where: {
				orderId: params.orderId,
			},
		});

		updatedOrder.OrderItemView.map(async (item: orderitemview) => {
			await sqlClient.orderItem.create({
				data: {
					orderId: params.orderId,
					productId: item.productId,
					productName: item.name || "",
					variants: item.variants, // hold values of product options selection delimited by comma
					variantCosts: item.variantCosts,
					quantity: item.quantity || 1,
					unitDiscount: item.unitDiscount || 0,
					unitPrice: item.unitPrice || 0,
				},
			});
		});

		const result = await getOrderById(params.orderId);

		return NextResponse.json(result);
	} catch (error) {
		logger.error("order updated", { metadata: { error } });

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
