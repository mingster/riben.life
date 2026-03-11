"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";
import { cancelWaitlistEntrySchema } from "./cancel-waitlist-entry.validation";
import { getT } from "@/app/i18n";

export const cancelWaitlistEntryAction = storeActionClient
	.metadata({ name: "cancelWaitlistEntry" })
	.schema(cancelWaitlistEntrySchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { waitlistId } = parsedInput;

		const entry = await sqlClient.waitList.findUnique({
			where: { id: waitlistId },
		});

		if (!entry) {
			const { t } = await getT();
			throw new SafeError(
				t("waitlist_entry_not_found") || "Waitlist entry not found",
			);
		}
		if (entry.storeId !== storeId) {
			const { t } = await getT();
			throw new SafeError(
				t("waitlist_entry_not_found") || "Waitlist entry not found",
			);
		}
		if (entry.status === "cancelled") {
			const { t } = await getT();
			throw new SafeError(
				t("waitlist_already_cancelled") || "Entry is already cancelled",
			);
		}

		const now = getUtcNowEpoch();
		const updated = await sqlClient.waitList.update({
			where: { id: waitlistId },
			data: { status: "cancelled", updatedAt: now },
			include: {
				Facility: { select: { id: true, facilityName: true } },
			},
		});

		transformPrismaDataForJson(updated);
		return { entry: updated };
	});
