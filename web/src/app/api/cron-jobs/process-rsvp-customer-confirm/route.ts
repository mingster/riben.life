import { NextResponse } from "next/server";
import { CustomerConfirmProcessor } from "@/lib/notification/customer-confirm-processor";
import logger from "@/lib/logger";

/**
 * API endpoint to process RSVP “customer must confirm” notifications
 * (createdAt + confirmHours, ReadyToConfirm only).
 * Call on the same cadence as process-reminders (e.g. every 10 minutes).
 *
 * Security: Bearer CRON_SECRET (same as process-reminders).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	const authHeader = request.headers.get("authorization");
	const cronSecret = process.env.CRON_SECRET;

	if (!cronSecret) {
		logger.error("CRON_SECRET not configured", {
			metadata: {
				endpoint: "/api/cron-jobs/process-rsvp-customer-confirm",
			},
			tags: ["cron", "customer_confirm", "error", "config"],
		});

		return NextResponse.json(
			{ error: "Cron secret not configured" },
			{ status: 500 },
		);
	}

	if (authHeader !== `Bearer ${cronSecret}`) {
		logger.warn("Unauthorized cron job attempt", {
			metadata: {
				endpoint: "/api/cron-jobs/process-rsvp-customer-confirm",
				hasAuthHeader: Boolean(authHeader),
			},
			tags: ["cron", "customer_confirm", "security", "unauthorized"],
		});

		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const processor = new CustomerConfirmProcessor();
		const result = await processor.processDueCustomerConfirmRequests();

		const jsonResult = {
			processed: result.processed,
			sent: result.sent,
			failed: result.failed,
			skipped: result.skipped,
			timestamp: result.timestamp ? Number(result.timestamp) : undefined,
		};

		return NextResponse.json(jsonResult, { status: 200 });
	} catch (error) {
		logger.error("Customer confirm cron failed", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			},
			tags: ["cron", "customer_confirm", "error"],
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
