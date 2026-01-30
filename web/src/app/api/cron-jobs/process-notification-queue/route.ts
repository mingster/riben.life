import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import { QueueManager } from "@/lib/notification/queue-manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * API endpoint to process the notification queue (LINE, On-Site, push, email queue items).
 * Calls QueueManager.processBatch() to send pending notifications via each channel adapter.
 *
 * Should run on a schedule (e.g. every 1–2 minutes) so LINE, On-Site, and other channels
 * are actually sent; otherwise notifications stay "pending".
 *
 * Security: Requires CRON_SECRET in Authorization header.
 *
 * Query parameters:
 * - batchSize: (optional) Max items per channel batch (default: 100)
 */
export async function GET(request: Request) {
	const authHeader = request.headers.get("authorization");
	const cronSecret = process.env.CRON_SECRET;

	if (!cronSecret) {
		logger.error("CRON_SECRET not configured", {
			metadata: { endpoint: "/api/cron-jobs/process-notification-queue" },
			tags: ["cron", "notification-queue", "error", "config"],
		});
		return NextResponse.json(
			{ error: "Cron secret not configured" },
			{ status: 500 },
		);
	}

	if (authHeader !== `Bearer ${cronSecret}`) {
		logger.warn("Unauthorized cron job attempt", {
			metadata: {
				endpoint: "/api/cron-jobs/process-notification-queue",
				hasAuthHeader: Boolean(authHeader),
			},
			tags: ["cron", "notification-queue", "security", "unauthorized"],
		});
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const { searchParams } = new URL(request.url);
		const batchSize = Number.parseInt(
			searchParams.get("batchSize") || "100",
			10,
		);
		const effectiveBatchSize =
			Number.isNaN(batchSize) || batchSize < 1 || batchSize > 500
				? 100
				: batchSize;

		const queueManager = new QueueManager();
		const result = await queueManager.processBatch(effectiveBatchSize);

		logger.info("Notification queue batch processed", {
			metadata: {
				processed: result.processed,
				successful: result.successful,
				failed: result.failed,
			},
			tags: ["cron", "notification-queue", "success"],
		});

		return NextResponse.json(result, { status: 200 });
	} catch (error) {
		logger.error("Process notification queue failed", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			},
			tags: ["cron", "notification-queue", "error"],
		});
		return NextResponse.json(
			{
				processed: 0,
				successful: 0,
				failed: 0,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
