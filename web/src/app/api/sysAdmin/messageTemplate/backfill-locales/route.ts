import { NextResponse } from "next/server";
import { CheckAdminApiAccess } from "../../api_helper";
import { backfillMissingTemplateLocalizations } from "@/lib/notification/template-localization-service";
import logger from "@/lib/logger";

export async function POST() {
	const accessCheck = await CheckAdminApiAccess();
	if (accessCheck) {
		return accessCheck;
	}

	try {
		const result = await backfillMissingTemplateLocalizations();
		return NextResponse.json({ success: true, result });
	} catch (error) {
		logger.error("Failed to backfill template localizations", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["sysadmin", "message-template", "backfill", "error"],
		});
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
