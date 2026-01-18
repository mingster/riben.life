import { cleanupUnpaidRsvps } from "@/actions/cleanup-unpaid-rsvps";
import { NextResponse } from "next/server";

/**
 * API endpoint to delete unpaid RSVPs older than a specified time threshold.
 * This endpoint is designed to be called by a cron job every 5 minutes.
 *
 * Query parameters:
 * - ageMinutes: (optional) Minimum age in minutes before deleting (default: 30)
 *
 * Example: /api/cron-jobs/cleanup-unpaid-rsvps?ageMinutes=30
 */
export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const ageMinutes = Number.parseInt(
			searchParams.get("ageMinutes") || "30",
			10,
		);

		// Call the server action
		const result = await cleanupUnpaidRsvps(ageMinutes);

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
				ageMinutes: Number.parseInt(
					new URL(req.url).searchParams.get("ageMinutes") || "30",
					10,
				),
				message: "Failed to cleanup unpaid RSVPs",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
