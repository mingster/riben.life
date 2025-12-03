import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import type { StoreSubscription } from "@prisma/client";
import { NextResponse } from "next/server";
import { CheckAdminApiAccess } from "../../../api_helper";
import logger from "@/lib/logger";

// for admin updates a store's subscription
export async function PATCH(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		CheckAdminApiAccess();

		const body = await req.json();

		const { subscriptionId, expiration, note, level } = body;

		if (!body.level) {
			return new NextResponse("level is required", { status: 403 });
		}

		const store = await sqlClient.store.update({
			where: {
				id: params.storeId,
			},
			data: {
				level: level,
				updatedAt: getUtcNowEpoch(),
			},
		});
		if (store === null) {
			return new NextResponse("Store Not Found", { status: 500 });
		}

		const _subscription = (await sqlClient.storeSubscription.findUnique({
			where: {
				storeId: store.id,
			},
		})) as StoreSubscription;

		if (store !== null) {
			await sqlClient.storeSubscription.update({
				where: {
					storeId: params.storeId,
				},
				data: {
					expiration: expiration,
					note: note,
					subscriptionId: subscriptionId,
				},
			});
		}

		return NextResponse.json(store);
	} catch (error) {
		logger.info("store patch", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
