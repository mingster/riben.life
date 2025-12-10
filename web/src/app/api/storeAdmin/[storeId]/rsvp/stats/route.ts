import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import { getRsvpStatsAction } from "@/actions/storeAdmin/rsvp/get-rsvp-stats";
import { transformPrismaDataForJson } from "@/utils/utils";

export async function GET(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		// Use server action which handles access control via storeActionClient
		const result = await getRsvpStatsAction(String(params.storeId), {});

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
