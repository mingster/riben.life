import { sqlClient } from "@/lib/prismadb";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
// import { getUtcNowEpoch } from "@/utils/datetime-utils"; // User model still uses DateTime with defaults
import { headers } from "next/headers";
import logger from "@/lib/logger";

///!SECTION update user data on user's own behave.
/**
 * @deprecated The method should not be used
 */
export async function PATCH(req: Request) {
	/*
	try {
		const session = await auth.api.getSession({
		headers: await headers(), // you need to pass the headers object.
		});
		const userId = session?.user.id;

		if (!userId) {
			return new NextResponse("Unauthenticated", { status: 403 });
		}

		const body = await req.json();
		const obj = await sqlClient.user.update({
			where: {
				id: userId,
			},
			data: { ...body }, // User model has @updatedAt directive
		});
		revalidatePath("/");
		//console.log(`updated user: ${JSON.stringify(obj)}`);

		return NextResponse.json(obj);
	} catch (error) {
		logger.info("user patch", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
		*/
	return new NextResponse("@deprecated", { status: 500 });
}
