import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../api_helper";
import { getFacilitiesAction } from "@/actions/storeAdmin/facility/get-facilities";

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
	try {
		// Use server action which handles access control via storeActionClient
		const result = await getFacilitiesAction(params.storeId, {});

		if (result?.serverError) {
			return NextResponse.json({ error: result.serverError }, { status: 403 });
		}

		const facilities = result?.data?.facilities ?? [];
		return NextResponse.json(facilities);
	} catch (error) {
		logger.error("get facilities", {
			metadata: {
				storeId: params.storeId,
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api", "error"],
		});

		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}
