import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import { getMonthlyStats } from "@/actions/get-monthly-stats";
import { transformPrismaDataForJson } from "@/utils/utils";

export async function GET(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	const { searchParams } = new URL(req.url);
	const yearParam = searchParams.get("year");
	const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

	if (isNaN(year)) {
		return NextResponse.json(
			{ error: "Invalid year parameter" },
			{ status: 400 },
		);
	}

	try {
		const stats = await getMonthlyStats(String(params.storeId), year);
		transformPrismaDataForJson(stats);
		return NextResponse.json(stats);
	} catch (error) {
		logger.error("get monthly stats", {
			metadata: {
				storeId: params.storeId,
				year,
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api", "monthly-stats", "error"],
		});

		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}
