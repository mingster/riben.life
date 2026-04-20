"use server";

import { sqlClient } from "@/lib/prismadb";
import { ensureWaitListSettingsRow } from "@/lib/store/waitlist/ensure-waitlist-settings";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { transformPrismaDataForJson } from "@/utils/utils";
import { updateStoreSystemsSchema } from "./update-store-systems.validation";

export const updateStoreSystemsAction = storeActionClient
	.metadata({ name: "updateStoreSystems" })
	.schema(updateStoreSystemsSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { useOrderSystem, acceptReservation, waitlistEnabled } = parsedInput;
		const now = getUtcNowEpoch();

		await sqlClient.$transaction(async (tx) => {
			await tx.store.update({
				where: { id: storeId },
				data: {
					useOrderSystem,
					updatedAt: now,
				},
			});

			const existing = await tx.rsvpSettings.findFirst({
				where: { storeId },
			});

			if (existing) {
				await tx.rsvpSettings.update({
					where: { id: existing.id },
					data: {
						acceptReservation,
						updatedAt: now,
					},
				});
			} else {
				await tx.rsvpSettings.create({
					data: {
						storeId,
						acceptReservation,
						createdAt: now,
						updatedAt: now,
					},
				});
			}

			await ensureWaitListSettingsRow(tx, storeId);
			await tx.waitListSettings.update({
				where: { storeId },
				data: {
					enabled: waitlistEnabled,
					updatedAt: now,
				},
			});
		});

		const payload = {
			useOrderSystem,
			acceptReservation,
			waitlistEnabled,
		};
		transformPrismaDataForJson(payload);
		return payload;
	});
