"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";
import { seatWaitlistEntrySchema } from "./seat-waitlist-entry.validation";
import { getT } from "@/app/i18n";

export const seatWaitlistEntryAction = storeActionClient
	.metadata({ name: "seatWaitlistEntry" })
	.schema(seatWaitlistEntrySchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { waitlistId, facilityId } = parsedInput;

		const entry = await sqlClient.waitList.findUnique({
			where: { id: waitlistId },
			include: { Order: true },
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

		const facility = await sqlClient.storeFacility.findFirst({
			where: { id: facilityId, storeId },
			select: { id: true },
		});
		if (!facility) {
			const { t } = await getT();
			throw new SafeError(
				t("waitlist_facility_not_found") || "Table/facility not found",
			);
		}

		const now = getUtcNowEpoch();
		await sqlClient.$transaction(async (tx) => {
			await tx.waitList.update({
				where: { id: waitlistId },
				data: {
					status: "seated",
					facilityId,
					seatedAt: now,
					updatedAt: now,
				},
			});
			if (entry.orderId) {
				await tx.storeOrder.update({
					where: { id: entry.orderId },
					data: { facilityId, updatedAt: now },
				});
			}
		});

		const updated = await sqlClient.waitList.findUnique({
			where: { id: waitlistId },
			include: {
				Facility: { select: { id: true, facilityName: true } },
			},
		});
		if (!updated) return { entry: null };
		transformPrismaDataForJson(updated);
		return { entry: updated };
	});
