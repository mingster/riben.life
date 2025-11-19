import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../api_helper";

///!SECTION create new store facility.
export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		const body = await req.json();
		const { prefix, numOfFacilities, capacity } = body;

		for (let i = 1; i < numOfFacilities + 1; i++) {
			await sqlClient.storeFacility.create({
				data: {
					storeId: params.storeId,
					facilityName: `${prefix}${i}`, // e.g. "A1", "A2", "A3"
					capacity,
				},
			});
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		logger.info("create new store facility", {
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

	const facilities = await sqlClient.storeFacility.findMany({
		where: {
			storeId: params.storeId,
		},
		orderBy: {
			facilityName: "asc",
		},
	});

	return NextResponse.json(facilities);
}
