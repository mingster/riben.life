import { sqlClient } from "@/lib/prismadb";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { NextResponse } from "next/server";
import { CheckAdminApiAccess } from "../../api_helper";

///!SECTION delete given message template in database.
export async function DELETE(
	_req: Request,
	props: { params: Promise<{ templateId: string }> },
) {
	CheckAdminApiAccess();

	const params = await props.params;
	try {
		if (!params.templateId) {
			return new NextResponse("id is required", { status: 400 });
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

		//console.log(`delete announcement: ${JSON.stringify(obj)}`);

		return NextResponse.json(obj);
	} catch (error) {
		if (
			error instanceof PrismaClientKnownRequestError &&
			error.code === "P2025"
		) {
			return new NextResponse("Message template not found", { status: 404 });
		}
		console.log("[DELETE]", error);
		return new NextResponse(`Internal error: ${(error as Error).message}`, {
			status: 500,
		});
	}
}
