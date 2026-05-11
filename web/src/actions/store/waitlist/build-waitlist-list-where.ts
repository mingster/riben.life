import type { Prisma, WaitListStatus } from "@prisma/client";

import { sqlClient } from "@/lib/prismadb";
import { getStoreTodayStartEndEpoch } from "@/utils/datetime-utils";
import { resolveWaitlistSessionBlock } from "@/utils/waitlist-session";

export type WaitlistListFilters = {
	/** Restrict rows to this status, or `"all"` for every status. */
	statusFilter: WaitListStatus | "all";
	sessionScope: "current_session" | "today" | "all";
};

/**
 * Shared Prisma where for waitlist admin list + nav badge counts ({@link listWaitlistAction}
 * passes the same `statusFilter` + `sessionScope`).
 */
export async function buildWaitlistListWhere(
	storeId: string,
	input: WaitlistListFilters,
): Promise<Prisma.WaitListWhereInput> {
	const statusWhere: Prisma.WaitListWhereInput =
		input.statusFilter === "all" ? {} : { status: input.statusFilter };

	const store = await sqlClient.store.findUnique({
		where: { id: storeId },
		select: {
			defaultTimezone: true,
			useBusinessHours: true,
		},
	});
	const storeSettings = await sqlClient.storeSettings.findUnique({
		where: { storeId },
		select: { businessHours: true },
	});
	const tz = store?.defaultTimezone || "Asia/Taipei";
	const { start: dayStart, end: dayEnd } = getStoreTodayStartEndEpoch(tz);

	let where: Prisma.WaitListWhereInput = { storeId, ...statusWhere };

	if (input.sessionScope === "today") {
		where = {
			...where,
			createdAt: { gte: dayStart, lt: dayEnd },
		};
	} else if (input.sessionScope === "current_session") {
		const resolved = resolveWaitlistSessionBlock({
			businessHoursJson: storeSettings?.businessHours ?? null,
			useBusinessHours: store?.useBusinessHours ?? true,
			defaultTimezone: tz,
		});
		if ("closed" in resolved) {
			where = {
				...where,
				createdAt: { gte: dayStart, lt: dayEnd },
			};
		} else {
			where = {
				...where,
				createdAt: { gte: dayStart, lt: dayEnd },
				sessionBlock: resolved.block,
			};
		}
	}

	return where;
}
