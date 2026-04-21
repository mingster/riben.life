import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { NextResponse } from "next/server";

// returns all locales currently in db
export async function GET(_req: Request) {
	const log = logger.child({ module: "get-locales" });

	try {
		const locales = await sqlClient.locale.findMany({
			orderBy: { id: "asc" },
		});

		return NextResponse.json(locales);
	} catch (error) {
		log.error(error, {
			message: "Failed to get locales",
			tags: ["locales", "error"],
			service: "get-locales",
			environment: process.env.NODE_ENV,
			version: process.env.npm_package_version,
		});

		return new NextResponse("Internal error", { status: 500 });
	}
}
