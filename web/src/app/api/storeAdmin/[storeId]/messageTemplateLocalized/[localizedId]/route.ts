import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";

///!SECTION delete given message template localized in database.
export async function DELETE(
	_req: Request,
	props: {
		params: Promise<{ storeId: string; localizedId: string }>;
	},
) {
	const params = await props.params;
	CheckStoreAdminApiAccess(params.storeId);

	try {
		if (!params.localizedId) {
			return new NextResponse("id is required", { status: 400 });
		}

		// Verify the localized template belongs to a store template (not global)
		const localized = await sqlClient.messageTemplateLocalized.findUnique({
			where: { id: params.localizedId },
			include: {
				MessageTemplate: true,
			},
		});

		if (!localized) {
			return new NextResponse("Message template localized not found", {
				status: 404,
			});
		}

		if (localized.MessageTemplate.isGlobal) {
			return new NextResponse("Cannot delete global template localizations", {
				status: 403,
			});
		}

		if (localized.MessageTemplate.storeId !== params.storeId) {
			return new NextResponse("Template does not belong to this store", {
				status: 403,
			});
		}

		const obj = await sqlClient.messageTemplateLocalized.delete({
			where: {
				id: params.localizedId,
			},
		});

		return NextResponse.json(obj);
	} catch (error) {
		if (
			error instanceof PrismaClientKnownRequestError &&
			error.code === "P2025"
		) {
			return new NextResponse("Message template localized not found", {
				status: 404,
			});
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
