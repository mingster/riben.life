import { auth } from "@/auth";
import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import type { StoreOrder } from "@prisma/client";
import type { Session } from "next-auth";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

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

		const params = await props.params;

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
				transformDecimalsToNumbers(orders);
				//revalidatePath("/order");

				return NextResponse.json(orders);
			}
		}

		// if no orderIds, try to get user's order if user is signed in
		const session = (await auth()) as Session;
		const userId = session?.user.id;

		if (userId) {
			const orders = (await sqlClient.storeOrder.findMany({
				where: {
					userId: session.user.id,
					//updateAt = today
					updatedAt: {
						gte: new Date(new Date().setHours(0, 0, 0, 0)),
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
			transformDecimalsToNumbers(orders);

			return NextResponse.json(orders);
		}

		// otherwise, return empty
		return NextResponse.json([]);
	} catch (error) {
		console.log("[POST]", error);

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
function getServerSession() {
	throw new Error("Function not implemented.");
}
