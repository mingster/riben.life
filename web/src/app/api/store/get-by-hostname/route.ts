import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

// returns store by its custom domain name
//
export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { customDomain } = body;

		if (!customDomain) {
			return new NextResponse("customDomain is required", { status: 400 });
		}

		const store = await sqlClient.store.findMany({
			where: { customDomain: customDomain },
		});

		transformPrismaDataForJson(store);

		return NextResponse.json(store);
	} catch (error) {
		logger.error("Failed to get store by hostname", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api", "store", "hostname", "error"],
		});

		return new NextResponse("Internal error", { status: 500 });
	}
}
