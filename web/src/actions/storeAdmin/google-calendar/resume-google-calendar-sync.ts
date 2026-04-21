"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

import { resumeGoogleCalendarSyncSchema } from "./resume-google-calendar-sync.validation";

/**
 * Clears calendar sync opt-out before OAuth so `ensureStoreUserGoogleCalendarConnectionFromAccount`
 * can mirror tokens again after linking Google.
 */
export const resumeGoogleCalendarSyncAction = storeActionClient
	.metadata({ name: "resumeGoogleCalendarSync" })
	.schema(resumeGoogleCalendarSyncSchema)
	.action(async ({ bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		const userId = session?.user?.id;
		if (typeof userId !== "string") {
			return { resumed: false };
		}

		await sqlClient.storeUserGoogleCalendarConnection.updateMany({
			where: { storeId, userId },
			data: {
				calendarSyncOptOut: false,
				isInvalid: false,
				updatedAt: getUtcNowEpoch(),
			},
		});

		return { resumed: true };
	});
