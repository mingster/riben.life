import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { CheckAdminApiAccess } from "../../api_helper";
import logger from "@/lib/logger";

// Delete a given message queue item in the database (sysAdmin only).
export async function DELETE(
	_req: Request,
	props: { params: Promise<{ queueId: string }> },
) {
	const params = await props.params;

	// Ensure the caller is a system admin
	await CheckAdminApiAccess();

	try {
		if (!params.queueId) {
			return new NextResponse("id is required", { status: 400 });
		}

		// Delete delivery status records first (safety, even if cascade is configured)
		await sqlClient.notificationDeliveryStatus.deleteMany({
			where: {
				notificationId: params.queueId,
			},
		});

		const message = await sqlClient.messageQueue.delete({
			where: {
				id: params.queueId,
			},
		});

		transformPrismaDataForJson(message);

		return NextResponse.json(message, { status: 200 });
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2025"
		) {
			return new NextResponse("Message not found", { status: 404 });
		}

		logger.error("Failed to delete message queue item", {
			metadata: {
				queueId: params.queueId,
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api", "sysAdmin", "messageQueue", "delete"],
		});

		return new NextResponse(`Internal error: ${(error as Error).message}`, {
			status: 500,
		});
	}
}
