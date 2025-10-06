import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { headers } from "next/headers";

import { NextResponse } from "next/server";

///!SECTION get all tickets that belong to the thread
export async function POST(
	_req: Request,
	props: { params: Promise<{ storeId: string; ticketId: string }> },
) {
	const params = await props.params;
	try {
		const session = await auth.api.getSession({
			headers: await headers(), // you need to pass the headers object.
		});
		const userId = session?.user.id;
		if (typeof userId !== "string") {
			return new NextResponse("Unauthenticated", { status: 403 });
		}
		if (!params.storeId) {
			return new NextResponse("Store id is required", { status: 400 });
		}

		const store = await sqlClient.store.findUnique({
			where: {
				id: params.storeId,
			},
		});

		if (!store) {
			return new NextResponse("Store not found", { status: 501 });
		}

		if (!params.ticketId) {
			return new NextResponse("ticketId is required", { status: 401 });
		}

		const thread = await sqlClient.supportTicket.findMany({
			where: {
				threadId: params.ticketId,
			},
			orderBy: {
				lastModified: "desc",
			},
		});

		return NextResponse.json(thread);
	} catch (error) {
		console.log("[TICKET_POST]", error);

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
