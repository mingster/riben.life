import { sqlClient } from "@/lib/prismadb";
import { Faq } from "@/types";
//import { logDBPrismaClient } from "@/lib/prisma-client-viewLog";
//import { transformBigIntToNumbers } from "@/utils/utils";

import { NextResponse } from "next/server";

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
		console.log("[get_faq]", error);
		return new NextResponse("Internal error", { status: 500 });
	}
}
