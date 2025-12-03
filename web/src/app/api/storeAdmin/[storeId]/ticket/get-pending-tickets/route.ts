import { sqlClient } from "@/lib/prismadb";
import { TicketStatus } from "@/types/enum";
import type { SupportTicket } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import logger from "@/lib/logger";

// returns all countries currently in db
export async function GET(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		const pendingTickets = (await sqlClient.supportTicket.findMany({
			where: {
				storeId: params.storeId,
				status: TicketStatus.Active || TicketStatus.Open,
			},
		})) as SupportTicket[];

		transformPrismaDataForJson(pendingTickets);
		return NextResponse.json(pendingTickets);
	} catch (error) {
		logger.error("get pending orders", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api", "error"],
		});

		return new NextResponse("Internal error", { status: 500 });
	}
}
