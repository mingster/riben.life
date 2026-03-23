"use server";

import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { SafeError } from "@/utils/error";
import { headers } from "next/headers";

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

		await sqlClient.storeUserGoogleCalendarConnection.deleteMany({
			where: { storeId, userId },
		});

		return { disconnected: true };
	});
