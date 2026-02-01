import logger from "@/lib/logger";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../api_helper";
import { getServiceStaffAction } from "@/actions/storeAdmin/serviceStaff/get-service-staff";

export async function GET(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	const { searchParams } = new URL(req.url);
	const facilityId = searchParams.get("facilityId") ?? undefined;
	const rsvpTimeIso = searchParams.get("rsvpTimeIso") ?? undefined;
	const storeTimezone = searchParams.get("storeTimezone") ?? undefined;

	try {
		// Check access at route boundary (consistent with other storeAdmin API routes)
		const accessCheck = await CheckStoreAdminApiAccess(params.storeId);
		if (accessCheck instanceof NextResponse) {
			return accessCheck;
		}
		if (!accessCheck.success) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
		}

		// Use server action which handles access control via storeActionClient
		// When facilityId + rsvpTimeIso + storeTimezone provided, filters staff by availability at that time
		const result = await getServiceStaffAction(params.storeId, {
			facilityId,
			rsvpTimeIso,
			storeTimezone,
		});

		if (result?.serverError) {
			return NextResponse.json({ error: result.serverError }, { status: 403 });
		}

		const serviceStaff = result?.data?.serviceStaff ?? [];

		// Data is already mapped and sorted by server action
		return NextResponse.json(serviceStaff);
	} catch (error) {
		logger.error("get service staff", {
			metadata: {
				storeId: params.storeId,
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api", "error"],
		});

		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}
