import { sendMailsInQueue } from "@/actions/mail/send-mails-in-queue";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

/**
 * API endpoint to process and send emails from the email queue.
 * This endpoint is designed to be called by a cron job every minute.
 *
 * Query parameters:
 * - batchSize: (optional) Number of emails to process per batch (default: 10)
 * - maxConcurrent: (optional) Maximum concurrent emails to send (default: 3)
 *
 * Example: /api/cron-jobs/sendmail?batchSize=20&maxConcurrent=5
 */
export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const batchSize = Number.parseInt(
			searchParams.get("batchSize") || "10",
			10,
		);
		const maxConcurrent = Number.parseInt(
			searchParams.get("maxConcurrent") || "3",
			10,
		);

		// Validate parameters
		if (Number.isNaN(batchSize) || batchSize < 1 || batchSize > 100) {
			return NextResponse.json(
				{
					processed: 0,
					success: 0,
					failed: 0,
					error: "Invalid batchSize parameter (must be between 1 and 100)",
				},
				{ status: 400 },
			);
		}

		if (
			Number.isNaN(maxConcurrent) ||
			maxConcurrent < 1 ||
			maxConcurrent > 10
		) {
			return NextResponse.json(
				{
					processed: 0,
					success: 0,
					failed: 0,
					error: "Invalid maxConcurrent parameter (must be between 1 and 10)",
				},
				{ status: 400 },
			);
		}

		// Call the server action
		const result = await sendMailsInQueue(batchSize, maxConcurrent);

		// Return appropriate HTTP status based on result
		if (result.error) {
			return NextResponse.json(result, { status: 500 });
		}

		return NextResponse.json(result, { status: 200 });
	} catch (error) {
		logger.error("Failed to send emails in queue via API route", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			},
			tags: ["cron", "sendmail", "error", "api-route"],
		});

		return NextResponse.json(
			{
				processed: 0,
				success: 0,
				failed: 0,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
