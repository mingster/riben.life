import { sqlClient } from "@/lib/prismadb";
import type { FaqCategory } from "@/types";
import { NextResponse } from "next/server";

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

		//transformBigIntToNumbers(messages);

		return NextResponse.json(messages);
	} catch (error) {
		console.log("[get_faq_category]", error);
		return new NextResponse("Internal error", { status: 500 });
	}
}
