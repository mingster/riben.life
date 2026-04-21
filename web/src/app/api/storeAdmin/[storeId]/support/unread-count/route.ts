import { NextResponse } from "next/server";

import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { TicketStatus } from "@/types/enum";

/**
 * Count of root support tickets that are still open (store-facing "unread" queue).
 * Aligns with store admin nav badge and root-thread listing semantics.
 */
export async function GET(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	const access = await CheckStoreAdminApiAccess(params.storeId);
	if (access instanceof Response) {
		return access;
	}

	try {
		const count = await sqlClient.supportTicket.count({
			where: {
				storeId: params.storeId,
				status: TicketStatus.Open,
				OR: [{ threadId: null }, { threadId: "" }],
			},
		});

		return NextResponse.json({ count });
	} catch (err: unknown) {
		logger.error("support unread-count", {
			metadata: {
				storeId: params.storeId,
				error: err instanceof Error ? err.message : String(err),
			},
			tags: ["api", "support", "error"],
		});
		return new NextResponse("Internal error", { status: 500 });
	}
}
