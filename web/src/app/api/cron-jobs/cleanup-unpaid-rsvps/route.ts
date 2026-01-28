import { cleanupUnpaidRsvps } from "@/actions/cleanup-unpaid-rsvps";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

/**
 * API endpoint to delete unpaid RSVPs that exceed the age threshold.
 * This endpoint is designed to be called by a cron job.
 *
 * Business Logic:
 * - Unpaid RSVPs are allowed to reserve a slot for a limited time
 * - After ageMinutes have elapsed, they are deleted to free up the slot
 * - This prevents reservation abuse while allowing customers time to pay
 *
 * Query Parameters:
 * - ageMinutes: Minimum age in minutes before deleting (default: 5)
 *
 * Examples:
 * - /api/cron-jobs/cleanup-unpaid-rsvps (uses default 5 minutes)
 * - /api/cron-jobs/cleanup-unpaid-rsvps?ageMinutes=10 (delete RSVPs older than 10 minutes)
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	const log = logger.child({ module: "cleanup-unpaid-rsvps-api" });

	try {
		// Extract ageMinutes query parameter (default: 5 minutes)
		const { searchParams } = new URL(request.url);
		const ageMinutesParam = searchParams.get("ageMinutes");
		const ageMinutes = ageMinutesParam ? parseInt(ageMinutesParam, 10) : 5;

		// Validate ageMinutes is a positive number
		if (isNaN(ageMinutes) || ageMinutes < 0) {
			log.warn("Invalid ageMinutes parameter", {
				metadata: { ageMinutesParam, parsed: ageMinutes },
				tags: ["cron", "cleanup", "rsvp", "validation"],
			});

			return NextResponse.json(
				{
					success: false,
					deleted: 0,
					deletedOrders: 0,
					message:
						"Invalid ageMinutes parameter - must be a non-negative number",
					error: `Invalid value: ${ageMinutesParam}`,
				},
				{ status: 400 },
			);
		}

		log.info("Starting cleanup of unpaid RSVPs", {
			metadata: { ageMinutes },
			tags: ["cron", "cleanup", "rsvp"],
		});

		// Call the server action with age threshold
		const result = await cleanupUnpaidRsvps(ageMinutes);

		// Return appropriate HTTP status based on result
		if (result.success) {
			return NextResponse.json(result, { status: 200 });
		} else {
			return NextResponse.json(result, { status: 400 });
		}
	} catch (error) {
		log.error("Failed to cleanup unpaid RSVPs", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["cron", "cleanup", "rsvp", "error"],
		});

		return NextResponse.json(
			{
				success: false,
				deleted: 0,
				deletedOrders: 0,
				message: "Failed to cleanup unpaid RSVPs",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
