"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";

import { disconnectGoogleCalendarSchema } from "./disconnect-google-calendar.validation";

export const disconnectGoogleCalendarAction = storeActionClient
	.metadata({ name: "disconnectGoogleCalendar" })
	.schema(disconnectGoogleCalendarSchema)
	.action(async ({ bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		const userId = session?.user?.id;
		if (typeof userId !== "string") {
			throw new SafeError("Unauthorized");
		}

		const existing =
			await sqlClient.storeUserGoogleCalendarConnection.findUnique({
				where: { storeId_userId: { storeId, userId } },
				select: { id: true },
			});

		if (existing) {
			await sqlClient.storeUserGoogleCalendarConnection.update({
				where: { id: existing.id },
				data: {
					calendarSyncOptOut: true,
					refreshTokenEnc: "",
					accessToken: null,
					accessTokenExpiresAt: null,
					isInvalid: true,
					updatedAt: getUtcNowEpoch(),
				},
			});
		}

		return { disconnected: true };
	});
