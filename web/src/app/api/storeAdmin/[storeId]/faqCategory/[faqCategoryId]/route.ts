import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { NextResponse } from "next/server";

import { sqlClient } from "@/lib/prismadb";
import { CheckStoreAdminApiAccess } from "../../../api_helper";

///!SECTION delete given faq category in database.
export async function DELETE(
	_req: Request,
	props: { params: Promise<{ storeId: string; faqCategoryId: string }> },
) {
	const params = await props.params;
	CheckStoreAdminApiAccess(params.storeId);

	try {
		if (!params.faqCategoryId) {
			return new NextResponse("id is required", { status: 400 });
		}

		//delete all faqs in this category
		await sqlClient.faq.deleteMany({
			where: {
				categoryId: params.faqCategoryId,
			},
		});

		const obj = await sqlClient.faqCategory.delete({
			where: {
				id: params.faqCategoryId,
			},
		});

		//console.log(`delete announcement: ${JSON.stringify(obj)}`);

		return NextResponse.json(obj);
	} catch (error) {
		if (
			error instanceof PrismaClientKnownRequestError &&
			error.code === "P2025"
		) {
			return new NextResponse("Faq category not found", { status: 404 });
		}
		console.log("[DELETE]", error);
		return new NextResponse(`Internal error: ${(error as Error).message}`, {
			status: 500,
		});
	}
}
