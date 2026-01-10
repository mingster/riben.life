import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { CheckAdminApiAccess } from "../../api_helper";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";

///!SECTION delete given message template localized in database.
export async function DELETE(
	_req: Request,
	props: { params: Promise<{ localizedId: string }> },
) {
	CheckAdminApiAccess();

	const params = await props.params;
	try {
		if (!params.localizedId) {
			return new NextResponse("id is required", { status: 400 });
		}

		const obj = await sqlClient.messageTemplateLocalized.delete({
			where: {
				id: params.localizedId,
			},
		});

		//console.log(`delete: ${JSON.stringify(obj)}`);

		return NextResponse.json(obj);
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
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
