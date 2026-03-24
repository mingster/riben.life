"use server";

import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { SafeError } from "@/utils/error";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { headers } from "next/headers";

import { updateGoogleCalendarConnectionCalendarSchema } from "./update-google-calendar-connection-calendar.validation";

export const updateGoogleCalendarConnectionCalendarAction = storeActionClient
	.metadata({ name: "updateGoogleCalendarConnectionCalendar" })
	.schema(updateGoogleCalendarConnectionCalendarSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { googleCalendarId } = parsedInput;

		const session = await auth.api.getSession({
			headers: await headers(),
		});
		const userId = session?.user?.id;
		if (typeof userId !== "string") {
			throw new SafeError("Unauthorized");
		}

		const row = await sqlClient.storeUserGoogleCalendarConnection.findUnique({
			where: {
				storeId_userId: { storeId, userId },
			},
			select: { id: true, isInvalid: true },
		});

		if (!row || row.isInvalid) {
			throw new SafeError("Google Calendar is not connected");
		}

		await sqlClient.storeUserGoogleCalendarConnection.update({
			where: { id: row.id },
			data: {
				googleCalendarId,
				updatedAt: getUtcNowEpoch(),
			},
		});

		return { googleCalendarId };
	});
