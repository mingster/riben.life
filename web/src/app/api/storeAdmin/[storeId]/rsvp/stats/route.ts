import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import { getRsvpStatsAction } from "@/actions/storeAdmin/rsvp/get-rsvp-stats";
import { transformPrismaDataForJson } from "@/utils/utils";

export async function GET(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	const { searchParams } = new URL(req.url);
	const period = searchParams.get("period") || "month";
	const startEpochParam = searchParams.get("startEpoch");
	const endEpochParam = searchParams.get("endEpoch");

	// Validate period type - "all" is valid and doesn't require date range
	const validPeriod = ["week", "month", "year", "all"].includes(period)
		? (period as "week" | "month" | "year" | "all")
		: "month";

	// Parse epoch timestamps (BigInt strings)
	// For "all" period, startEpoch and endEpoch are null
	const startEpoch = startEpochParam ? BigInt(startEpochParam) : null;
	const endEpoch = endEpochParam ? BigInt(endEpochParam) : null;

	// Only validate date range if period is not "all"
	if (validPeriod !== "all" && (!startEpoch || !endEpoch)) {
		return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
	}

	try {
		// Use server action which handles access control via storeActionClient
		const result = await getRsvpStatsAction(String(params.storeId), {
			period: validPeriod,
			startEpoch: startEpoch ?? null,
			endEpoch: endEpoch ?? null,
		});

		if (result?.serverError) {
			return NextResponse.json({ error: result.serverError }, { status: 403 });
		}

		const stats = result?.data ?? null;
		transformPrismaDataForJson(stats);
		return NextResponse.json(stats);
	} catch (error) {
		logger.error("get rsvp stats", {
			metadata: {
				storeId: params.storeId,
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api", "rsvp", "error"],
		});

		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}
