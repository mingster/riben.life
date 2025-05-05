import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
//import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import type { Session } from "next-auth";

///!SECTION update user data on user's own behave.
export async function PATCH(req: Request) {
	try {
		const session = (await auth()) as Session;
		const userId = session?.user.id;

		if (!userId) {
			return new NextResponse("Unauthenticated", { status: 403 });
		}

		const body = await req.json();
		const { orderIds } = body;

		if (orderIds) {
			//console.log("link order", orderIds);

			const cnt = await sqlClient.storeOrder.updateMany({
				where: {
					id: {
						in: orderIds,
					},
					userId: null,
				},
				data: {
					userId: userId,
					//updatedAt: getUtcDate(),
				},
			});
		}

		//revalidatePath("/order");

		return NextResponse.json("success");
	} catch (error) {
		console.log("[PATCH]", error);

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
