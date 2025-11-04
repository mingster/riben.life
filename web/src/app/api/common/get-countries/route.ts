import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

// returns all countries currently in db
export async function GET(_req: Request) {
	try {
		const countries = await sqlClient.country.findMany({
			orderBy: { alpha3: "asc" },
		});

		return NextResponse.json(countries);
	} catch (error) {
		logger.error("Failed to get countries", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api", "countries", "error"],
		});

		return new NextResponse("Internal error", { status: 500 });
	}
}
