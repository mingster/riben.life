import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function PATCH(req: Request) {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		const userId = session?.user?.id;

		if (!userId) {
			return NextResponse.json({ error: "Unauthenticated" }, { status: 403 });
		}

		const body = await req.json();
		const { locale, timezone, phoneNumber } = body;

		const updatedUser = await sqlClient.user.update({
			where: { id: userId },
			data: {
				...(locale && { locale }),
				...(timezone && { timezone }),
				//...(phoneNumber !== undefined && { phoneNumber }),
			},
		});

		return NextResponse.json(updatedUser);
	} catch (error) {
		logger.error("Failed to update user settings", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api", "user", "update-settings"],
		});

		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Internal server error",
			},
			{ status: 500 },
		);
	}
}
