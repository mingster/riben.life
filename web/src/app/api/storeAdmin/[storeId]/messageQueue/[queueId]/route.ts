import { sqlClient } from "@/lib/prismadb";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import logger from "@/lib/logger";

///!SECTION delete given message queue item in database.
export async function DELETE(
	_req: Request,
	props: { params: Promise<{ storeId: string; queueId: string }> },
) {
	const params = await props.params;
	CheckStoreAdminApiAccess(params.storeId);

	try {
		if (!params.queueId) {
			return new NextResponse("id is required", { status: 400 });
		}

		// Verify the message queue item belongs to this store
		const messageQueue = await sqlClient.messageQueue.findUnique({
			where: { id: params.queueId },
		});

		if (!messageQueue) {
			return new NextResponse("Message queue item not found", { status: 404 });
		}

		if (messageQueue.storeId !== params.storeId) {
			return new NextResponse(
				"Message queue item does not belong to this store",
				{
					status: 403,
				},
			);
		}

		// Delete delivery statuses first (cascade should handle this, but being explicit)
		await sqlClient.notificationDeliveryStatus.deleteMany({
			where: {
				notificationId: params.queueId,
			},
		});

		const obj = await sqlClient.messageQueue.delete({
			where: {
				id: params.queueId,
			},
		});

		return NextResponse.json(obj);
	} catch (error) {
		if (
			error instanceof PrismaClientKnownRequestError &&
			error.code === "P2025"
		) {
			return new NextResponse("Message queue item not found", { status: 404 });
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
