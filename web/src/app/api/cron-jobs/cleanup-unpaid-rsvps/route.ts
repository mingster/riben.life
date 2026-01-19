import { cleanupUnpaidRsvps } from "@/actions/cleanup-unpaid-rsvps";
import { NextResponse } from "next/server";

/**
 * API endpoint to delete all unpaid RSVPs.
 * This endpoint is designed to be called by a cron job.
 * The cron job schedule determines when unpaid RSVPs should be cleaned up.
 *
 * Example: /api/cron-jobs/cleanup-unpaid-rsvps
 */
export async function GET(_req: Request) {
	try {
		// Call the server action (no parameters - cron job handles scheduling)
		const result = await cleanupUnpaidRsvps();

		// Return appropriate HTTP status based on result
		if (result.success) {
			return NextResponse.json(result, { status: 200 });
		} else {
			return NextResponse.json(result, { status: 400 });
		}
	} catch (error) {
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
