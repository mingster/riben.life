import { sqlClient } from "@/lib/prismadb";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import logger from "@/lib/logger";

///!SECTION delete given message template in database.
export async function DELETE(
	_req: Request,
	props: { params: Promise<{ storeId: string; templateId: string }> },
) {
	const params = await props.params;
	CheckStoreAdminApiAccess(params.storeId);

	try {
		if (!params.templateId) {
			return new NextResponse("id is required", { status: 400 });
		}

		// Verify the template belongs to this store and is not global
		const template = await sqlClient.messageTemplate.findUnique({
			where: { id: params.templateId },
		});

		if (!template) {
			return new NextResponse("Message template not found", { status: 404 });
		}

		if (template.isGlobal) {
			return new NextResponse("Cannot delete global templates", {
				status: 403,
			});
		}

		if (template.storeId !== params.storeId) {
			return new NextResponse("Template does not belong to this store", {
				status: 403,
			});
		}

		//delete all message template localizations in this message template
		await sqlClient.messageTemplateLocalized.deleteMany({
			where: {
				messageTemplateId: params.templateId,
			},
		});

		const obj = await sqlClient.messageTemplate.delete({
			where: {
				id: params.templateId,
			},
		});

		return NextResponse.json(obj);
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2025"
		) {
			return new NextResponse("Message template not found", { status: 404 });
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
