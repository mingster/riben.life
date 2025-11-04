import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

// gate keeper for store admin api access
export async function CheckStoreAdminApiAccess(storeId: string) {
	try {
		const session = await auth.api.getSession({
			headers: await headers(), // you need to pass the headers object.
		});
		const userId = session?.user.id;
		if (typeof userId !== "string") {
			return new NextResponse("Unauthenticated", { status: 400 });
		}

		if (!storeId) {
			return new NextResponse("Store id is required", { status: 401 });
		}

		const test = await sqlClient.store.findFirst({
			where: {
				id: storeId,
				ownerId: userId,
			},
		});

		//const test = await checkStoreAdminAccess(storeId, userId);

		if (!test) {
			return new NextResponse("Unauthenticated", { status: 402 });
		}

		return true;
	} catch (error) {
		logger.error("checkaccess", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api", "error"],
		});

		return false;
	}
}
