import { sqlClient } from "@/lib/prismadb";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getUtcNow } from "@/utils/datetime-utils";


///!SECTION update user data on user's own behave.
/**
 * @deprecated The method should not be used
 */
export async function PATCH(req: Request) {
	/*
	try {
const session = await auth.api.getSession({
		headers: await headers(), // you need to pass the headers object.
	});		const userId = session?.user.id;

		if (!userId) {
			return new NextResponse("Unauthenticated", { status: 403 });
		}

		const body = await req.json();
		const obj = await sqlClient.user.update({
			where: {
				id: userId,
			},
			data: { ...body, updatedAt: getUtcNow() },
		});
		revalidatePath("/");
		//console.log(`updated user: ${JSON.stringify(obj)}`);

		return NextResponse.json(obj);
	} catch (error) {
		console.log("[USER_PATCH]", error);

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
		*/
	return new NextResponse("@deprecated", { status: 500 });
}
