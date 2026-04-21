"use server";

import { WaitListStatus } from "@prisma/client";
import { getT } from "@/app/i18n";
import { sqlClient } from "@/lib/prismadb";
import { baseClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";

import { cancelMyWaitlistEntrySchema } from "./cancel-my-waitlist-entry.validation";

/**
 * Customer cancels their own waitlist entry while status is still `waiting`.
 * Requires the same verificationCode + ids as queue position polling.
 */
export const cancelMyWaitlistEntryAction = baseClient
	.metadata({ name: "cancelMyWaitlistEntry" })
	.schema(cancelMyWaitlistEntrySchema)
	.action(async ({ parsedInput }) => {
		const { storeId, waitlistId, verificationCode } = parsedInput;

		const entry = await sqlClient.waitList.findFirst({
			where: { id: waitlistId, storeId, verificationCode },
			select: { id: true, status: true },
		});

		if (!entry) {
			const { t } = await getT();
			throw new SafeError(
				t("waitlist_entry_not_found") || "Waitlist entry not found",
			);
		}
		if (entry.status !== WaitListStatus.waiting) {
			const { t } = await getT();
			throw new SafeError(
				t("waitlist_cannot_cancel_not_waiting") ||
					"You can only cancel while your party is still waiting.",
			);
		}

		const now = getUtcNowEpoch();
		const updated = await sqlClient.waitList.update({
			where: { id: waitlistId },
			data: { status: WaitListStatus.cancelled, updatedAt: now },
		});

		transformPrismaDataForJson(updated);
		return { entry: updated };
	});
