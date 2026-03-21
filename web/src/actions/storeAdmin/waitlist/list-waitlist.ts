"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getStoreTodayStartEndEpoch } from "@/utils/datetime-utils";
import { resolveWaitlistSessionBlock } from "@/utils/waitlist-session";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { WaitlistListEntry } from "./waitlist-list-entry";
import { listWaitlistSchema } from "./list-waitlist.validation";

const ALL_SCOPE_MAX_ROWS = 300;

export const listWaitlistAction = storeActionClient
	.metadata({ name: "listWaitlist" })
	.schema(listWaitlistSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { statusFilter, sessionScope } = parsedInput;

		const statusWhere =
			statusFilter === "active"
				? { status: { in: ["waiting", "called"] as const } }
				: {};

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

		let where: Record<string, unknown> = { storeId, ...statusWhere };

		if (sessionScope === "today") {
			where = {
				...where,
				createdAt: { gte: dayStart, lt: dayEnd },
			};
		} else if (sessionScope === "current_session") {
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

		const entries = await sqlClient.waitList.findMany({
			where,
			orderBy:
				sessionScope === "all"
					? [{ createdAt: "desc" }]
					: [
							{ sessionBlock: "asc" },
							{ queueNumber: "asc" },
							{ createdAt: "asc" },
						],
			take: sessionScope === "all" ? ALL_SCOPE_MAX_ROWS : undefined,
		});

		transformPrismaDataForJson(entries);
		// transformPrismaDataForJson mutates BigInt → number; Prisma types are unchanged.
		return { entries: entries as unknown as WaitlistListEntry[] };
	});
