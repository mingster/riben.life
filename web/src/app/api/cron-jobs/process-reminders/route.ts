import { NextResponse } from "next/server";
import { ReminderProcessor } from "@/lib/notification/reminder-processor";
import logger from "@/lib/logger";

/**
 * API endpoint to process RSVP reminder notifications.
 * This endpoint is designed to be called by a cron job every 10 minutes.
 *
 * Security: Requires CRON_SECRET in Authorization header
 *
 * Example: GET /api/cron-jobs/process-reminders
 * Headers: Authorization: Bearer ${CRON_SECRET}
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	// Verify cron secret (security)
	const authHeader = request.headers.get("authorization");
	const cronSecret = process.env.CRON_SECRET;

	if (!cronSecret) {
		logger.error("CRON_SECRET not configured", {
			metadata: {
				endpoint: "/api/cron-jobs/process-reminders",
			},
			tags: ["cron", "reminder", "error", "config"],
		});

		return NextResponse.json(
			{ error: "Cron secret not configured" },
			{ status: 500 },
		);
	}

	if (authHeader !== `Bearer ${cronSecret}`) {
		logger.warn("Unauthorized cron job attempt", {
			metadata: {
				endpoint: "/api/cron-jobs/process-reminders",
				hasAuthHeader: Boolean(authHeader),
			},
			tags: ["cron", "reminder", "security", "unauthorized"],
		});

		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const processor = new ReminderProcessor();
		const result = await processor.processDueReminders();

		logger.info("Reminder processing completed", {
			metadata: {
				processed: result.processed,
				sent: result.sent,
				failed: result.failed,
				skipped: result.skipped,
				timestamp: result.timestamp ? Number(result.timestamp) : undefined,
			},
			tags: ["cron", "reminder", "success"],
		});

		return NextResponse.json(result, { status: 200 });
	} catch (error) {
		logger.error("Reminder processing failed", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			},
			tags: ["cron", "reminder", "error"],
		});

		return NextResponse.json(
			{
				error: "Processing failed",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
