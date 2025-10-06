import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { type NextRequest, NextResponse } from "next/server";
type Params = Promise<{ storeId: string }>;

// get all orders in the given orderId array
//
export async function GET(
	request: Request,
	props: {
		params: Params;
	},
) {
	const log = logger.child({ module: "get-faq" });

	try {
		const _params = await props.params;

		const faqs = await sqlClient.faqCategory.findMany({
			where: {
				storeId: _params.storeId,
			},
			include: {
				FAQ: {
					orderBy: { sortOrder: "asc" },
				},
			},
			orderBy: {
				sortOrder: "asc",
			},
		});

		return NextResponse.json(faqs);
	} catch (error) {
		log.error(error, { message: "Failed to get FAQ" });

		return new NextResponse(`Internal error: ${error}`, { status: 500 });
	}
}