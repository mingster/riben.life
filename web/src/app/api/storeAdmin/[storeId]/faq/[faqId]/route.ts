import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { NextResponse } from "next/server";

import { sqlClient } from "@/lib/prismadb";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import logger from "@/lib/logger";

///!SECTION delete given faq in database.
export async function DELETE(
	_req: Request,
	props: { params: Promise<{ storeId: string; faqId: string }> },
) {
	const params = await props.params;
	CheckStoreAdminApiAccess(params.storeId);

	try {
		if (!params.faqId) {
			return new NextResponse("id is required", { status: 400 });
		}

		const obj = await sqlClient.faq.delete({
			where: {
				id: params.faqId,
			},
		});

		//console.log(`delete: ${JSON.stringify(obj)}`);

		return NextResponse.json(obj);
	} catch (error) {
		if (
			error instanceof PrismaClientKnownRequestError &&
			error.code === "P2025"
		) {
			return new NextResponse("Faq not found", { status: 404 });
		}
		logger.info("delete", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});
		return new NextResponse(`Internal error: ${(error as Error).message}`, {
			status: 500,
		});
	}
}
