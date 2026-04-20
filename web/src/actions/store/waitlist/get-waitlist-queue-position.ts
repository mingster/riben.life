"use server";

import { WaitListStatus } from "@prisma/client";
import { sqlClient } from "@/lib/prismadb";
import { baseClient } from "@/utils/actions/safe-action";
import { getStoreTodayStartEndEpoch } from "@/utils/datetime-utils";
import { getWaitlistQueuePositionSchema } from "./get-waitlist-queue-position.validation";

export const getWaitlistQueuePositionAction = baseClient
	.metadata({ name: "getWaitlistQueuePosition" })
	.schema(getWaitlistQueuePositionSchema)
	.action(async ({ parsedInput }) => {
		const { storeId, waitlistId, verificationCode } = parsedInput;

		const entry = await sqlClient.waitList.findFirst({
			where: { id: waitlistId, storeId, verificationCode },
			select: {
				queueNumber: true,
				status: true,
				sessionBlock: true,
				createdAt: true,
				waitTimeMs: true,
			},
		});

		if (!entry) {
			return {
				ok: false as const,
				ahead: 0,
				waitingInSession: 0,
				status: null as string | null,
				joinedAt: null as number | null,
				waitTimeMs: null as number | null,
			};
		}

		const joinedAt = Number(entry.createdAt);
		const waitTimeMs =
			entry.waitTimeMs !== null && entry.waitTimeMs !== undefined
				? Number(entry.waitTimeMs)
				: null;

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { defaultTimezone: true },
		});
		const tz = store?.defaultTimezone || "Asia/Taipei";
		const { start: dayStart, end: dayEnd } = getStoreTodayStartEndEpoch(tz);

		const waitingInSession = await sqlClient.waitList.count({
			where: {
				storeId,
				sessionBlock: entry.sessionBlock,
				createdAt: { gte: dayStart, lt: dayEnd },
				status: WaitListStatus.waiting,
			},
		});

		let ahead = 0;
		if (entry.status === WaitListStatus.waiting) {
			ahead = await sqlClient.waitList.count({
				where: {
					storeId,
					sessionBlock: entry.sessionBlock,
					createdAt: { gte: dayStart, lt: dayEnd },
					status: WaitListStatus.waiting,
					queueNumber: { lt: entry.queueNumber },
				},
			});
		}

		return {
			ok: true as const,
			ahead,
			waitingInSession,
			status: entry.status,
			queueNumber: entry.queueNumber,
			sessionBlock: entry.sessionBlock,
			joinedAt,
			waitTimeMs,
		};
	});
