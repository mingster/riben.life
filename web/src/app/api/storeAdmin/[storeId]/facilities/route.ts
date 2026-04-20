import { NextResponse } from "next/server";
import { getFacilitiesAction } from "@/actions/storeAdmin/facility/get-facilities";
import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import logger from "@/lib/logger";

export async function GET(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	const access = await CheckStoreAdminApiAccess(params.storeId);
	if (access instanceof NextResponse) {
		return access;
	}

	try {
		const result = await getFacilitiesAction(params.storeId, {});

		if (result?.serverError) {
			return NextResponse.json({ error: result.serverError }, { status: 403 });
		}

		const facilities = result?.data?.facilities ?? [];
		return NextResponse.json(facilities);
	} catch (err: unknown) {
		logger.error("get facilities", {
			metadata: {
				storeId: params.storeId,
				error: err instanceof Error ? err.message : String(err),
			},
			tags: ["api", "error"],
		});

		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}
