"use server";

import { WaitListStatus } from "@prisma/client";

import { sqlClient } from "@/lib/prismadb";
import { formatPublicWaitlistGuestLabel } from "@/lib/waitlist/mask-public-entry";
import type { WaitlistSessionBlock } from "@/lib/waitlist/session";
import { baseClient } from "@/utils/actions/safe-action";
import { getStoreTodayStartEndEpoch } from "@/utils/datetime-utils";

import { listWaitlistPublicQueueSchema } from "./list-waitlist-public-queue.validation";

export interface PublicWaitlistQueueEntry {
	queueNumber: number;
	status: string;
	numOfAdult: number;
	numOfChild: number;
	maskedName: string;
	isYou: boolean;
}

export const listWaitlistPublicQueueAction = baseClient
	.metadata({ name: "listWaitlistPublicQueue" })
	.schema(listWaitlistPublicQueueSchema)
	.action(async ({ parsedInput }) => {
		const { storeId, sessionBlock, waitlistId, verificationCode } = parsedInput;

		const settings = await sqlClient.waitListSettings.findUnique({
			where: { storeId },
			select: { showQueueOnWaitlistPage: true },
		});
		if (!settings?.showQueueOnWaitlistPage) {
			return {
				showQueue: false as const,
				entries: [] as PublicWaitlistQueueEntry[],
			};
		}

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { defaultTimezone: true },
		});
		const tz = store?.defaultTimezone || "Asia/Taipei";
		const { start: dayStart, end: dayEnd } = getStoreTodayStartEndEpoch(tz);

		let verifiedYouId: string | null = null;
		if (waitlistId && verificationCode) {
			const own = await sqlClient.waitList.findFirst({
				where: { id: waitlistId, storeId, verificationCode },
				select: { id: true },
			});
			if (own) {
				verifiedYouId = own.id;
			}
		}

		const rows = await sqlClient.waitList.findMany({
			where: {
				storeId,
				sessionBlock,
				createdAt: { gte: dayStart, lt: dayEnd },
				status: {
					in: [WaitListStatus.waiting, WaitListStatus.called],
				},
			},
			orderBy: { queueNumber: "asc" },
			select: {
				id: true,
				queueNumber: true,
				status: true,
				numOfAdult: true,
				numOfChild: true,
				name: true,
				lastName: true,
				phone: true,
			},
		});

		const entries: PublicWaitlistQueueEntry[] = rows.map((row) => ({
			queueNumber: row.queueNumber,
			status: String(row.status),
			numOfAdult: row.numOfAdult,
			numOfChild: row.numOfChild,
			maskedName: formatPublicWaitlistGuestLabel({
				name: row.name,
				lastName: row.lastName,
				phone: row.phone,
			}),
			isYou: verifiedYouId != null && row.id === verifiedYouId,
		}));

		return {
			showQueue: true as const,
			sessionBlock: sessionBlock as WaitlistSessionBlock,
			entries,
		};
	});
