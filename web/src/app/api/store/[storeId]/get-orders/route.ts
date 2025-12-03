import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { StoreOrder } from "@prisma/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import {
	getUtcNowEpoch,
	epochToDate,
	dateToEpoch,
} from "@/utils/datetime-utils";

type Params = Promise<{ storeId: string }>;

// get all orders in the given orderId array
//
export async function POST(
	request: Request,
	props: {
		params: Params;
	},
) {
	try {
		const body = await request.json();
		const { orderIds } = body;

		const _params = await props.params;

		//console.log("get-orders", orderIds);

		if (orderIds) {
			const orders = (await sqlClient.storeOrder.findMany({
				where: {
					id: {
						in: orderIds,
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

			if (orders.length > 0) {
				transformPrismaDataForJson(orders);
				//revalidatePath("/order");

				return NextResponse.json(orders);
			}
		}

		// if no orderIds, try to get user's order if user is signed in
		const session = await auth.api.getSession({
			headers: await headers(), // you need to pass the headers object.
		});

		const userId = session?.user.id;

		if (userId) {
			// Use UTC for date calculations
			const nowEpoch = getUtcNowEpoch();
			const now = epochToDate(nowEpoch)!;
			const todayStart = new Date(
				Date.UTC(
					now.getUTCFullYear(),
					now.getUTCMonth(),
					now.getUTCDate(),
					0,
					0,
					0,
					0,
				),
			);
			const orders = (await sqlClient.storeOrder.findMany({
				where: {
					userId: userId,
					//updateAt = today (UTC)
					updatedAt: {
						gte: dateToEpoch(todayStart) ?? BigInt(0),
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
			transformPrismaDataForJson(orders);

			return NextResponse.json(orders);
		}

		// otherwise, return empty
		return NextResponse.json([]);
	} catch (error) {
		logger.error("Failed to get orders", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api", "store", "orders", "error"],
		});

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
