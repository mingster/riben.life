import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

// returns all currencies currently in db
export async function GET(_req: Request) {
	try {
		const currencies = await sqlClient.currency.findMany({
			select: {
				id: true,
				name: true,
				symbolNative: true,
			},
			orderBy: {
				id: "asc",
			},
		});

		//const currencies = await prismadb.currency.findMany({ orderBy: { id: 'asc' } });

		return NextResponse.json(currencies);
	} catch (error) {
		logger.error("Failed to get currencies", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api", "currencies", "error"],
		});

		return new NextResponse("Internal error", { status: 500 });
	}
}
