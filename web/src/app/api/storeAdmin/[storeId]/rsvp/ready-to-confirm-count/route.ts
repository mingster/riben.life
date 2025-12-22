import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { RsvpStatus } from "@/types/enum";
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";

export async function GET(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		// Check store access
		const accessibleStore = await checkStoreStaffAccess(params.storeId);
		if (!accessibleStore) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
		}

		// Count RSVPs with status ReadyToConfirm and confirmedByStore = false
		const count = await sqlClient.rsvp.count({
			where: {
				storeId: params.storeId,
				status: RsvpStatus.ReadyToConfirm,
				confirmedByStore: false,
			},
		});

		return NextResponse.json({ count });
	} catch (error) {
		logger.error("get ready to confirm rsvp count", {
			metadata: {
				storeId: params.storeId,
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api", "rsvp", "error"],
		});

		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}
