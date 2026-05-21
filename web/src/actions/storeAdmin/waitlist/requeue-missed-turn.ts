"use server";

import { WaitListStatus } from "@prisma/client";
import { getT } from "@/app/i18n";
import { sqlClient } from "@/lib/prismadb";
import { computeRequeueQueueNumber } from "@/lib/waitlist/missed-turn";
import { storeActionClient } from "@/utils/actions/safe-action";
import {
	getStoreDayStartEndEpochForInstant,
	getUtcNowEpoch,
} from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";

import { requeueMissedTurnSchema } from "./requeue-missed-turn.validation";

export const requeueMissedTurnAction = storeActionClient
	.metadata({ name: "requeueMissedTurn" })
	.schema(requeueMissedTurnSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { waitlistId } = parsedInput;
		const { t } = await getT();

		const settings = await sqlClient.waitListSettings.findUnique({
			where: { storeId },
		});
		if (!settings?.missedTurnEnabled) {
			throw new SafeError(
				t("waitlist_missed_turn_disabled") || "Missed-turn requeue is disabled",
			);
		}

		const entry = await sqlClient.waitList.findUnique({
			where: { id: waitlistId },
		});
		if (!entry || entry.storeId !== storeId) {
			throw new SafeError(
				t("waitlist_entry_not_found") || "Waitlist entry not found",
			);
		}
		if (entry.status !== WaitListStatus.called || entry.notifiedAt == null) {
			throw new SafeError(
				t("waitlist_missed_turn_not_called") ||
					"Only called parties can be requeued for missed turn",
			);
		}

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { defaultTimezone: true },
		});
		const tz = store?.defaultTimezone || "Asia/Taipei";
		const { start: dayStart, end: dayEnd } = getStoreDayStartEndEpochForInstant(
			tz,
			entry.createdAt,
		);

		const positionFromTop = Math.max(
			1,
			settings.missedTurnRequeuePositionFromTop ?? 3,
		);

		const now = getUtcNowEpoch();

		const updated = await sqlClient.$transaction(async (tx) => {
			const waiting = await tx.waitList.findMany({
				where: {
					storeId,
					sessionBlock: entry.sessionBlock,
					status: WaitListStatus.waiting,
					createdAt: { gte: dayStart, lt: dayEnd },
					id: { not: waitlistId },
				},
				orderBy: { queueNumber: "asc" },
				select: { id: true, queueNumber: true },
			});

			const { targetQueueNumber, bumpFromQueueNumber } =
				computeRequeueQueueNumber({
					waitingQueueNumbers: waiting.map((w) => w.queueNumber),
					positionFromTop,
				});

			const toBump = waiting
				.filter((w) => w.queueNumber >= bumpFromQueueNumber)
				.sort((a, b) => b.queueNumber - a.queueNumber);

			for (const w of toBump) {
				await tx.waitList.update({
					where: { id: w.id },
					data: {
						queueNumber: w.queueNumber + 1,
						updatedAt: now,
					},
				});
			}

			return tx.waitList.update({
				where: { id: waitlistId },
				data: {
					status: WaitListStatus.waiting,
					queueNumber: targetQueueNumber,
					notifiedAt: null,
					missedTurnCount: { increment: 1 },
					updatedAt: now,
				},
			});
		});

		transformPrismaDataForJson(updated);
		return { entry: updated, queueNumber: updated.queueNumber };
	});
