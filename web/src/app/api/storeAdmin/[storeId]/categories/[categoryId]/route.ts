import checkStoreAdminAccess from "@/actions/storeAdmin/check-store-access";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import logger from "@/lib/logger";

///!SECTION update Category record in database.
export async function PATCH(
	req: Request,
	props: { params: Promise<{ storeId: string; categoryId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		if (!params.categoryId) {
			return new NextResponse("category id is required", { status: 401 });
		}

		const body = await req.json();
		const obj = await sqlClient.category.update({
			where: {
				id: params.categoryId,
			},
			data: { ...body },
		});

		logger.info("Operation log", {
			tags: ["api"],
		});

		transformPrismaDataForJson(obj);
		return NextResponse.json(obj);
	} catch (error) {
		logger.info("category patch", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}

///!SECTION delete Category record in database.
export async function DELETE(
	_req: Request,
	props: { params: Promise<{ storeId: string; categoryId: string }> },
) {
	const params = await props.params;
	//try {
	CheckStoreAdminApiAccess(params.storeId);

	if (!params.categoryId) {
		return new NextResponse("category id is required", { status: 401 });
	}

	const obj = await sqlClient.category.delete({
		where: {
			id: params.categoryId,
		},
	});

	logger.info("Operation log", {
		tags: ["api"],
	});

	transformPrismaDataForJson(obj);
	return NextResponse.json(obj);
	/*} catch (error) {
    logger.info("category delete", {
    	metadata: {
    		error: error instanceof Error ? error.message : String(error),
    	},
    	tags: ["api"],
    });
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }*/
}
