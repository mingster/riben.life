import { IsSignInResponse } from "@/lib/auth/utils";
import { sqlClient } from "@/lib/prismadb";
import { getUtcNow } from "@/lib/utils";
import { NextResponse } from "next/server";
import { CheckAdminApiAccess } from "../../../api_helper";
import { Subscription } from "@prisma/client";

// for admin updates a store's subscription
export async function PATCH(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		CheckAdminApiAccess();

		const body = await req.json();

		const { stripeSubscriptionId, expiration, note, level } = body;

		if (!body.level) {
			return new NextResponse("level is required", { status: 403 });
		}

		const store = await sqlClient.store.update({
			where: {
				id: params.storeId,
			},
			data: {
				level: level,
				updatedAt: getUtcNow(),
			},
		});
		if (store === null) {
			return new NextResponse(`Store Not Found`, { status: 500 });
		}

		const subscription = (await sqlClient.subscription.findUnique({
			where: {
				storeId: store.id,
			},
		})) as Subscription;

		if (store !== null) {
			await sqlClient.subscription.update({
				where: {
					storeId: params.storeId,
				},
				data: {
					expiration: expiration,
					note: note,
					stripeSubscriptionId: stripeSubscriptionId,
				},
			});
		}

		return NextResponse.json(store);
	} catch (error) {
		console.log("[STORE_PATCH]", error);

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
