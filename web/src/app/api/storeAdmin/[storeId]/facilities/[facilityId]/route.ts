import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";

//delete store facility by its id
export async function DELETE(
	_req: Request,
	props: { params: Promise<{ storeId: string; facilityId: string }> },
) {
	const params = await props.params;
	//try {
	CheckStoreAdminApiAccess(params.storeId);

	if (!params.facilityId) {
		return new NextResponse("table id is required", { status: 400 });
	}

	// TO-DO: only archive the product if there's order already placed.

	const obj = await sqlClient.storeFacility.delete({
		where: {
			id: params.facilityId,
		},
	});

	logger.info("store facility deleted", {
		tags: ["api"],
	});

	return NextResponse.json(obj);
	/*} catch (error) {
	logger.info("delete store facility", {
		metadata: {
			error: error instanceof Error ? error.message : String(error),
		},
		tags: ["api"],
	});
	return new NextResponse(`Internal error${error}`, { status: 500 });
  }*/
}

///!SECTION update facilityId in database.
export async function PATCH(
	req: Request,
	props: { params: Promise<{ storeId: string; facilityId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		if (!params.facilityId) {
			return new NextResponse("table id is required", { status: 400 });
		}

		const body = await req.json();

		const { facilityName } = body;

		if (!facilityName) {
			return new NextResponse("Name is required", { status: 400 });
		}

		const obj = await sqlClient.storeFacility.update({
			where: {
				id: params.facilityId,
			},
			data: {
				...body,
			},
		});

		return NextResponse.json(obj);
	} catch (error) {
		logger.info("update store facility", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
