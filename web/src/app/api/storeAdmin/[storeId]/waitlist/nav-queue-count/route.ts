import { WaitListStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { sqlClient } from "@/lib/prismadb";
import { buildWaitlistListWhere } from "@/lib/store/waitlist/build-waitlist-list-where";

/**
 * Count of **awaiting** (status `waiting`) entries in the current session — store admin waitlist nav badge.
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

	const where = await buildWaitlistListWhere(params.storeId, {
		statusFilter: WaitListStatus.waiting,
		sessionScope: "current_session",
	});

	const count = await sqlClient.waitList.count({ where });

	return NextResponse.json({ count });
}
