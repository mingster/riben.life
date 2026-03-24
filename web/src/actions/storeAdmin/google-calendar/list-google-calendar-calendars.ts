"use server";

import { auth } from "@/lib/auth";
import {
	type WritableGoogleCalendarOption,
	listWritableGoogleCalendarsForConnection,
} from "@/lib/google-calendar/list-writable-google-calendars";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { headers } from "next/headers";

import { listGoogleCalendarCalendarsSchema } from "./list-google-calendar-calendars.validation";

export type ListGoogleCalendarListError =
	| "unauthorized"
	| "list_failed"
	| "calendar_not_signed_up";

interface ListGoogleCalendarCalendarsResult {
	readonly calendars: WritableGoogleCalendarOption[];
	readonly listError: ListGoogleCalendarListError | null;
}

export const listGoogleCalendarCalendarsAction = storeActionClient
	.metadata({ name: "listGoogleCalendarCalendars" })
	.schema(listGoogleCalendarCalendarsSchema)
	.action(async ({ bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		const userId = session?.user?.id;
		if (typeof userId !== "string") {
			const out: ListGoogleCalendarCalendarsResult = {
				calendars: [],
				listError: "unauthorized",
			};
			return out;
		}

		const row = await sqlClient.storeUserGoogleCalendarConnection.findUnique({
			where: {
				storeId_userId: { storeId, userId },
			},
		});

		if (!row || row.isInvalid) {
			const out: ListGoogleCalendarCalendarsResult = {
				calendars: [],
				listError: null,
			};
			return out;
		}

		const outcome = await listWritableGoogleCalendarsForConnection({
			storeId,
			googleCalendarId: row.googleCalendarId,
			refreshTokenEnc: row.refreshTokenEnc,
			accessToken: row.accessToken,
			accessTokenExpiresAt: row.accessTokenExpiresAt,
			updateTokens: async (data) => {
				await sqlClient.storeUserGoogleCalendarConnection.update({
					where: { id: row.id },
					data: {
						accessToken: data.accessToken,
						accessTokenExpiresAt: data.accessTokenExpiresAt,
						...(data.refreshTokenEnc
							? { refreshTokenEnc: data.refreshTokenEnc }
							: {}),
						updatedAt: getUtcNowEpoch(),
					},
				});
			},
		});

		if (outcome.ok) {
			const out: ListGoogleCalendarCalendarsResult = {
				calendars: outcome.calendars,
				listError: null,
			};
			return out;
		}

		if (outcome.errorKind === "not_signed_up") {
			logger.warn(
				"Google Calendar: account has not enabled Calendar (userNotSignedUp)",
				{
					metadata: { storeId, message: outcome.message },
					tags: ["google-calendar"],
				},
			);
			const out: ListGoogleCalendarCalendarsResult = {
				calendars: [],
				listError: "calendar_not_signed_up",
			};
			return out;
		}

		logger.error("Google Calendar calendar list failed", {
			metadata: {
				storeId,
				error: outcome.message,
			},
			tags: ["google-calendar", "error"],
		});
		const out: ListGoogleCalendarCalendarsResult = {
			calendars: [],
			listError: "list_failed",
		};
		return out;
	});
