import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

///!SECTION create faq record in database.
export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string; categoryId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		if (!params.categoryId) {
			return new NextResponse("faq category id is required", { status: 400 });
		}

		const body = await req.json();
		const obj = await sqlClient.faq.create({
			data: { categoryId: params.categoryId, ...body },
		});

		//console.log(`create Faq: ${JSON.stringify(obj)}`);

		return NextResponse.json(obj);
	} catch (error) {
		logger.info("faq post", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
