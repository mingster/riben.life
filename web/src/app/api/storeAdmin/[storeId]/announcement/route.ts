import checkStoreAdminAccess from "@/actions/storeAdmin/check-store-access";
import { sqlClient } from "@/lib/prismadb";
import { getUtcNow } from "@/lib/utils";

import { IsSignInResponse } from "@/lib/auth/utils";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../api_helper";

///!SECTION create Category record in database.
export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		const userId = await IsSignInResponse();
		if (typeof userId !== "string") {
			return new NextResponse("Unauthenticated", { status: 403 });
		}

		CheckStoreAdminApiAccess(params.storeId);

		const body = await req.json();
		const obj = await sqlClient.storeAnnouncement.create({
			data: {
				storeId: params.storeId,
				...body,
				updatedAt: getUtcNow(),
			},
		});

		//console.log(`create announcement: ${JSON.stringify(obj)}`);

		return NextResponse.json(obj);
	} catch (error) {
		console.log("[StoreAnnouncement_POST]", error);

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
