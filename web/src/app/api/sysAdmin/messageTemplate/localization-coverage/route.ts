import { NextResponse } from "next/server";
import { CheckAdminApiAccess } from "../../api_helper";
import { getTemplateLocalizationCoverageReport } from "@/lib/notification/template-localization-service";
import logger from "@/lib/logger";

export async function GET() {
	const accessCheck = await CheckAdminApiAccess();
	if (accessCheck) {
		return accessCheck;
	}
	try {
		const report = await getTemplateLocalizationCoverageReport();
		return NextResponse.json({ success: true, report });
	} catch (error) {
		logger.error("Failed to load localization coverage report", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["sysadmin", "message-template", "coverage", "error"],
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
