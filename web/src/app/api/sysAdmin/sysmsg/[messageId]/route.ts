import { sqlClient } from "@/lib/prismadb";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { CheckAdminApiAccess } from "../../api_helper";
import logger from "@/lib/logger";

///!SECTION delete given system message in database.
export async function DELETE(
	_req: Request,
	props: { params: Promise<{ messageId: string }> },
) {
	CheckAdminApiAccess();

	const params = await props.params;
	try {
		if (!params.messageId) {
			return new NextResponse("message id is required", { status: 400 });
		}

		const obj = await sqlClient.systemMessage.delete({
			where: {
				id: params.messageId,
			},
		});

		//console.log(`delete announcement: ${JSON.stringify(obj)}`);

		return NextResponse.json(obj);
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2025"
		) {
			return new NextResponse("System message not found", { status: 404 });
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
