import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { TicketStatus } from "@/types/enum";
import { getUtcNow } from "@/utils/datetime-utils";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

///!SECTION create new ticket from store's support page.
export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
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

		const body = await req.json();
		const { department, subject, message } = body;

		const obj = await sqlClient.supportTicket.create({
			data: {
				storeId: params.storeId,
				threadId: uuidv4(),
				senderId: userId,
				recipientId: store.ownerId,
				priority: 1,
				creator: userId,
				modifier: userId,
				status: TicketStatus.Open,
				department,
				subject,
				message,
				lastModified: getUtcNow(),
			},
		});

		/*
    const obj2 = await sqlClient.supportTicket.update({
      where: {
        id: obj.id,
      },
      data: {
        threadId: obj.id,
      },
    });
    console.log(`create ticket: ${JSON.stringify(obj)}`);
    */

		return NextResponse.json(obj);
	} catch (error) {
		console.log("[TICKET_POST]", error);

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
