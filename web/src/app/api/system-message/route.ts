import { NextRequest, NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const locale = searchParams.get("locale") || "en";

		const msg = await sqlClient.systemMessage.findFirst({
			where: { published: true },
			orderBy: { createdOn: "desc" },
			include: { locales: true },
		});

		if (!msg) {
			return NextResponse.json({ message: null });
		}

		const variant =
			msg.locales.find((l) => l.localeId === locale) ??
			msg.locales.find((l) => l.localeId === "en") ??
			msg.locales[0] ??
			null;

		return NextResponse.json({ message: variant ?? null });
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
