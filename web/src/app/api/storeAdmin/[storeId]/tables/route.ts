import getStoreTables from "@/actions/get-store-tables";
import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/utils/utils";
import type { StoreFacility } from "@prisma/client";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../api_helper";
import logger from "@/lib/logger";

///!SECTION create new store table.
export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		const body = await req.json();
		const { prefix, numOfTables, capacity } = body;

		for (let i = 1; i < numOfTables + 1; i++) {
			await sqlClient.storeFacility.create({
				data: {
					storeId: params.storeId,
					tableName: `${prefix}${i}`,
					capacity,
				},
			});
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		logger.info("tables post", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}

export async function GET(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	CheckStoreAdminApiAccess(params.storeId);

	const tables = await sqlClient.storeFacility.findMany({
		where: {
			storeId: params.storeId,
		},
		orderBy: {
			tableName: "asc",
		},
	});

	return NextResponse.json(tables);
}
