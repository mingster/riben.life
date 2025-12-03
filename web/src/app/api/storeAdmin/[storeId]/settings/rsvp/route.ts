import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import logger from "@/lib/logger";

export async function PATCH(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);
		const session = await auth.api.getSession({
			headers: await headers(), // you need to pass the headers object.
		});
		const userId = session?.user.id;
		if (typeof userId !== "string") {
			return new NextResponse("Unauthenticated", { status: 400 });
		}
		//console.log(`userId: ${userId}`);

		const body = await req.json();
		//const { customDomain, logo, logoPublicId, acceptAnonymousOrder } = body;

		const store = await sqlClient.store.update({
			where: {
				id: params.storeId,
				ownerId: userId,
			},
			data: {
				...body,
				updatedAt: getUtcNowEpoch(),
			},
		});

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
