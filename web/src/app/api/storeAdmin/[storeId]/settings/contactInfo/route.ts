import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import logger from "@/lib/logger";

//NOTE - update store's contact info
export async function PATCH(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		const body = await req.json();

		const storeSettings = await sqlClient.storeSettings.upsert({
			where: {
				storeId: params.storeId,
			},
			update: { ...body, updatedAt: getUtcNowEpoch() },
			create: {
				storeId: params.storeId,
				...body,
			},
		});

		/*
		const { streetLine1 } = body;
		if (streetLine1) {
			const address = await mongoClient.address.upsert({
				where: {
					storeSettingsId: storeSettings.id,
				},
				update: { ...body, updatedAt: getUtcNowEpoch() },
				create: {
					storeSettingsId: storeSettings.id,
					...body,
				},
			});
		}
    */

		//console.log(`storeSettings: ${JSON.stringify(storeSettings)}`);

		return NextResponse.json(storeSettings);
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
