import { IsSignInResponse } from "@/lib/auth/utils";
import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";

export async function PATCH(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);
		const userId = await IsSignInResponse();
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
				//updatedAt: getUtcDate(),
			},
		});

		return NextResponse.json(store);
	} catch (error) {
		console.log("[STORE_PATCH]", error);

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
