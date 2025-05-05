import checkStoreAdminAccess from "@/actions/storeAdmin/check-store-access";

import { sqlClient } from "@/lib/prismadb";
import { getUtcNow } from "@/lib/utils";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";

///!SECTION update Category record in database.
export async function PATCH(
	req: Request,
	props: { params: Promise<{ storeId: string; messageId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		if (!params.messageId) {
			return new NextResponse("announcement id is required", { status: 401 });
		}

		const body = await req.json();
		const obj = await sqlClient.storeAnnouncement.update({
			where: {
				id: params.messageId,
			},
			data: { ...body, updatedAt: getUtcNow() },
		});

		//console.log(`update announcement: ${JSON.stringify(obj)}`);

		return NextResponse.json(obj);
	} catch (error) {
		console.log("[StoreAnnouncement_PATCH]", error);

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}

///!SECTION delete Category record in database.
export async function DELETE(
	_req: Request,
	props: { params: Promise<{ storeId: string; messageId: string }> },
) {
	const params = await props.params;
	//try {

	CheckStoreAdminApiAccess(params.storeId);

	if (!params.messageId) {
		return new NextResponse("message id is required", { status: 401 });
	}

	//const body = await req.json();
	const obj = await sqlClient.storeAnnouncement.delete({
		where: {
			id: params.messageId,
		},
	});

	//console.log(`delete announcement: ${JSON.stringify(obj)}`);

	return NextResponse.json(obj);
	/*
  } catch (error) {
    console.log("[StoreAnnouncement_DELETE]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
     */
}
