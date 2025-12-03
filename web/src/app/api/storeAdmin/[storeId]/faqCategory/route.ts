import { sqlClient } from "@/lib/prismadb";
import type { FaqCategory } from "@/types";
import { transformPrismaDataForJson } from "@/utils/utils";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

// return all online peers
//
export async function GET(req: Request) {
	try {
		const messages = (await sqlClient.faqCategory.findMany({
			include: {
				FAQ: true,
			},
			orderBy: {
				sortOrder: "asc",
			},
		})) as FaqCategory[];

		transformPrismaDataForJson(messages);

		return NextResponse.json(messages);
	} catch (error) {
		logger.info("get faq category", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});
		return new NextResponse("Internal error", { status: 500 });
	}
}
