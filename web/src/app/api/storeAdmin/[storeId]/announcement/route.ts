import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { getUtcNow } from "@/utils/datetime-utils";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../api_helper";

///!SECTION create Category record in database.
export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		const session = await auth.api.getSession({
			headers: await headers(), // you need to pass the headers object.
		});
		const userId = session?.user.id;
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
