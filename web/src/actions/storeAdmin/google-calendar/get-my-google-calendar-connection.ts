"use server";

import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { transformPrismaDataForJson } from "@/utils/utils";
import { headers } from "next/headers";

import { getMyGoogleCalendarConnectionSchema } from "./get-my-google-calendar-connection.validation";

export const getMyGoogleCalendarConnectionAction = storeActionClient
	.metadata({ name: "getMyGoogleCalendarConnection" })
	.schema(getMyGoogleCalendarConnectionSchema)
	.action(async ({ bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		const userId = session?.user?.id;
		if (typeof userId !== "string") {
			return {
				connected: false,
				googleCalendarId: null as string | null,
				isInvalid: false,
				needsReconnect: false,
				updatedAt: null as number | null,
			};
		}

		const row = await sqlClient.storeUserGoogleCalendarConnection.findUnique({
			where: {
				storeId_userId: { storeId, userId },
			},
			select: {
				googleCalendarId: true,
				isInvalid: true,
				updatedAt: true,
			},
		});

		const payload = row
			? { ...row, updatedAt: row.updatedAt }
			: null;
		transformPrismaDataForJson(payload);

		const connected = Boolean(row && !row.isInvalid);
		return {
			connected,
			googleCalendarId: row?.googleCalendarId ?? null,
			isInvalid: row?.isInvalid ?? false,
			needsReconnect: Boolean(row?.isInvalid),
			updatedAt: payload?.updatedAt != null ? Number(payload.updatedAt) : null,
		};
	});
