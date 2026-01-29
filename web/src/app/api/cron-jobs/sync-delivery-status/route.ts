import { NextResponse } from "next/server";
import { syncDeliveryStatusInternal } from "@/actions/sysAdmin/notification/sync-delivery-status";
import logger from "@/lib/logger";

/**
 * API endpoint to sync notification delivery statuses.
 * This endpoint is designed to be called by a cron job periodically.
 *
 * Security: Requires CRON_SECRET in Authorization header
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
				endpoint: "/api/cron-jobs/sync-delivery-status",
			},
			tags: ["cron", "delivery-sync", "error", "config"],
		});

		return NextResponse.json(
			{ error: "Cron secret not configured" },
			{ status: 500 },
		);
	}

	if (authHeader !== `Bearer ${cronSecret}`) {
		logger.warn("Unauthorized cron job attempt", {
			metadata: {
				endpoint: "/api/cron-jobs/sync-delivery-status",
				hasAuthHeader: Boolean(authHeader),
			},
			tags: ["cron", "delivery-sync", "security", "unauthorized"],
		});

		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		// Call the internal function directly (doesn't require admin session)
		const result = await syncDeliveryStatusInternal();

		/*
		logger.info("Delivery status sync completed", {
			metadata: {
				processed: result.processed,
				updated: result.updated,
			},
			tags: ["cron", "delivery-sync", "success"],
		});
		*/

		return NextResponse.json(result, { status: 200 });
	} catch (error) {
		logger.error("Delivery status sync failed", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			},
			tags: ["cron", "delivery-sync", "error"],
		});

		return NextResponse.json(
			{
				error: "Sync failed",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
