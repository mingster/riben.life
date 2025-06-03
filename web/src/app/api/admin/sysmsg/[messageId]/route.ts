import { sqlClient } from "@/lib/prismadb";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { NextResponse } from "next/server";
import { CheckAdminApiAccess } from "../../api_helper";

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
			error instanceof PrismaClientKnownRequestError &&
			error.code === "P2025"
		) {
			return new NextResponse("System message not found", { status: 404 });
		}
		console.log("[DELETE]", error);
		return new NextResponse(`Internal error: ${(error as Error).message}`, {
			status: 500,
		});
	}
}
