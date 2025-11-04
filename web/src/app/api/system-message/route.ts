import { NextRequest, NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";
import { SystemMessage } from "@/types";
import logger from "@/lib/logger";

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const locale = searchParams.get("locale") || "en";

		// Get the latest published system message for the specified locale
		const message = (await sqlClient.systemMessage.findFirst({
			where: { published: true, localeId: locale },
			orderBy: { createdOn: "desc" },
		})) as SystemMessage | null;

		return NextResponse.json({
			message: message,
		});
	} catch (error) {
		logger.error("Failed to fetch system message", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api", "system-message", "error"],
		});
		return NextResponse.json(
			{ error: "Failed to fetch system message" },
			{ status: 500 },
		);
	}
}
