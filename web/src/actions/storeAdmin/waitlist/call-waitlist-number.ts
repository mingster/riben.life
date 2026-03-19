"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";
import { callWaitlistNumberSchema } from "./call-waitlist-number.validation";
import { getT } from "@/app/i18n";

/** Send in-app notification when customer is signed in (customerId set). */
async function sendWaitlistCalledInAppNotification(
	storeId: string,
	storeOwnerId: string,
	customerId: string,
	queueNumber: number,
) {
	const now = getUtcNowEpoch();
	await sqlClient.messageQueue.create({
		data: {
			senderId: storeOwnerId,
			recipientId: customerId,
			storeId,
			subject: `Your table is ready – #${queueNumber}`,
			message: `Your table is ready – #${queueNumber}. Please come to the host stand.`,
			createdAt: now,
			updatedAt: now,
			notificationType: "waitlist",
			actionUrl: `/s/${storeId}/waitlist`,
		},
	});
}

export const callWaitlistNumberAction = storeActionClient
	.metadata({ name: "callWaitlistNumber" })
	.schema(callWaitlistNumberSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { waitlistId } = parsedInput;

		const entry = await sqlClient.waitList.findUnique({
			where: { id: waitlistId },
			include: {
				Store: { select: { name: true, ownerId: true } },
				Customer: { select: { name: true, phoneNumber: true, email: true } },
			},
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
		if (entry.status !== "waiting") {
			const { t } = await getT();
			throw new SafeError(
				t("waitlist_already_called") || "This number was already called",
			);
		}

		const now = getUtcNowEpoch();
		const updated = await sqlClient.waitList.update({
			where: { id: waitlistId },
			data: { status: "called", notifiedAt: now, updatedAt: now },
			include: {
				Facility: { select: { id: true, facilityName: true } },
			},
		});

		// In-app notification for signed-in customer
		if (entry.customerId && entry.Store?.ownerId) {
			try {
				await sendWaitlistCalledInAppNotification(
					storeId,
					entry.Store.ownerId,
					entry.customerId,
					entry.queueNumber,
				);
			} catch {
				// Non-fatal: entry was already updated
			}
		}
		// TODO: SMS / LINE / email "Your table is ready – #N" using store notification config

		transformPrismaDataForJson(updated);
		return { entry: updated };
	});
