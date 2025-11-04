import { sqlClient } from "@/lib/prismadb";
import { getUtcNow } from "@/utils/datetime-utils";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../api_helper";
import logger from "@/lib/logger";

///!SECTION create faqCategory record in database.
export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		const body = await req.json();
		const obj = await sqlClient.faqCategory.create({
			data: {
				storeId: params.storeId,
				...body,
				updatedAt: getUtcNow(),
			},
		});

		logger.info("Operation log", {
			tags: ["api"],
		});

		return NextResponse.json(obj);
	} catch (error) {
		logger.info("faq category post", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
