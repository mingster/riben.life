import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";

import { NextResponse } from "next/server";
import logger from "@/lib/logger";

///!SECTION update product attribute in database.
export async function PATCH(
	req: Request,
	props: { params: Promise<{ storeId: string; productId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		if (!params.productId) {
			return new NextResponse("product id is required", { status: 400 });
		}

		const body = await req.json();
		const obj = await sqlClient.productAttribute.update({
			where: {
				productId: params.productId,
			},
			data: { ...body },
		});

		//console.log(`updated product attribute: ${JSON.stringify(obj)}`);
		transformPrismaDataForJson(obj);

		return NextResponse.json(obj);
	} catch (error) {
		logger.info("product attribute patch", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
