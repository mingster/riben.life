import { sqlClient } from "@/lib/prismadb";
import { getUtcNow } from "@/utils/utils";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";

//NOTE - update privacy policy of the store
export async function PATCH(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		const body = await req.json();

		const { tos } = body;

		const storeSettings = await sqlClient.storeSettings.upsert({
			where: {
				storeId: params.storeId,
			},
			update: { tos, updatedAt: getUtcNow() },
			create: {
				tos,
				storeId: params.storeId,
			},
		});

		//console.log(`storeSettings: ${JSON.stringify(storeSettings)}`);

		return NextResponse.json(storeSettings);
	} catch (error) {
		console.log("[STORE_PATCH]", error);

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
