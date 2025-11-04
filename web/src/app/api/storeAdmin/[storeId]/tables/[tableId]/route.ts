import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/utils/utils";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import logger from "@/lib/logger";

//delete storetable by its id
export async function DELETE(
	_req: Request,
	props: { params: Promise<{ storeId: string; tableId: string }> },
) {
	const params = await props.params;
	//try {
	CheckStoreAdminApiAccess(params.storeId);

	if (!params.tableId) {
		return new NextResponse("table id is required", { status: 400 });
	}

	// TO-DO: only archive the product if there's order already placed.

	const obj = await sqlClient.storeTables.delete({
		where: {
			id: params.tableId,
		},
	});

	logger.info("store table deleted", {
		tags: ["api"],
	});

	return NextResponse.json(obj);
	/*} catch (error) {
    logger.info("product delete", {
    	metadata: {
    		error: error instanceof Error ? error.message : String(error),
    	},
    	tags: ["api"],
    });
    return new NextResponse("Internal error", { status: 500 });
  }*/
}

///!SECTION update tableId in database.
export async function PATCH(
	req: Request,
	props: { params: Promise<{ storeId: string; tableId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		if (!params.tableId) {
			return new NextResponse("table id is required", { status: 400 });
		}

		const body = await req.json();

		const { tableName } = body;

		if (!tableName) {
			return new NextResponse("Name is required", { status: 400 });
		}

		const obj = await sqlClient.storeTables.update({
			where: {
				id: params.tableId,
			},
			data: {
				...body,
			},
		});

		return NextResponse.json(obj);
	} catch (error) {
		logger.info("store table patch", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
