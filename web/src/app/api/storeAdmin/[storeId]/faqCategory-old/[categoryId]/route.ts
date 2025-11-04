import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import logger from "@/lib/logger";

///!SECTION update faqCategory record in database.
export async function PATCH(
	req: Request,
	props: { params: Promise<{ storeId: string; categoryId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		if (!params.categoryId) {
			return new NextResponse("category id is required", { status: 401 });
		}

		const body = await req.json();
		const obj = await sqlClient.faqCategory.update({
			where: {
				id: params.categoryId,
			},
			data: { ...body },
		});

		//console.log(`update FaqCategory: ${JSON.stringify(obj)}`);

		return NextResponse.json(obj);
	} catch (error) {
		logger.info("faq category patch", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}

///!SECTION delete faqCategory record in database.
export async function DELETE(
	req: Request,
	props: { params: Promise<{ storeId: string; categoryId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		if (!params.categoryId) {
			return new NextResponse("category id is required", { status: 401 });
		}

		const _body = await req.json();
		const obj = await sqlClient.faqCategory.delete({
			where: {
				id: params.categoryId,
			},
		});

		//console.log(`delete FaqCategory: ${JSON.stringify(obj)}`);

		return NextResponse.json(obj);
	} catch (error) {
		logger.info("faq category delete", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
