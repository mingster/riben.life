import { sqlClient } from "@/lib/prismadb";
import type { Faq } from "@/types";
//import { logDBPrismaClient } from "@/lib/prisma-client-viewLog";
//import { transformBigIntToNumbers } from "@/utils/utils";

import { NextResponse } from "next/server";
import logger from "@/lib/logger";

// return all online peers
//
export async function GET(req: Request) {
	try {
		const faqs = (await sqlClient.faq.findMany({
			include: {
				FaqCategory: true,
			},
			orderBy: {
				sortOrder: "asc",
			},
		})) as Faq[];

		//transformBigIntToNumbers(faqs);

		return NextResponse.json(faqs);
	} catch (error) {
		logger.info("get faq", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});
		return new NextResponse("Internal error", { status: 500 });
	}
}
