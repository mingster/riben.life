import { NextRequest, NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";
import { SystemMessage } from "@/types";

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
		console.error("Error fetching system message:", error);
		return NextResponse.json(
			{ error: "Failed to fetch system message" },
			{ status: 500 },
		);
	}
}
