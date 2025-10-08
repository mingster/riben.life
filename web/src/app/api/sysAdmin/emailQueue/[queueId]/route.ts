import { sqlClient } from "@/lib/prismadb";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { NextResponse } from "next/server";
import { CheckAdminApiAccess } from "../../api_helper";

///!SECTION delete given queued email in database.
export async function DELETE(
	_req: Request,
	props: { params: Promise<{ queueId: string }> },
) {
	CheckAdminApiAccess();

	const params = await props.params;
	try {
		if (!params.queueId) {
			return new NextResponse("id is required", { status: 400 });
		}

		const obj = await sqlClient.emailQueue.delete({
			where: {
				id: params.queueId,
			},
		});

		//console.log(`delete: ${JSON.stringify(obj)}`);

		return NextResponse.json(obj, { status: 200 });
	} catch (error) {
		if (
			error instanceof PrismaClientKnownRequestError &&
			error.code === "P2025"
		) {
			return new NextResponse("Email not found", { status: 404 });
		}
		console.log("[DELETE]", error);
		return new NextResponse(`Internal error: ${(error as Error).message}`, {
			status: 500,
		});
	}
}
