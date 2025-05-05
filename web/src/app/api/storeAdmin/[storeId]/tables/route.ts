import getStoreTables from "@/actions/get-store-tables";
import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import type { StoreTables } from "@prisma/client";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../api_helper";

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
			await sqlClient.storeTables.create({
				data: {
					storeId: params.storeId,
					tableName: `${prefix}${i}`,
					capacity,
				},
			});
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.log("[TABLES_POST]", error);

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}

export async function GET(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	CheckStoreAdminApiAccess(params.storeId);

	const tables = await sqlClient.storeTables.findMany({
		where: {
			storeId: params.storeId,
		},
		orderBy: {
			tableName: "asc",
		},
	});

	return NextResponse.json(tables);
}
