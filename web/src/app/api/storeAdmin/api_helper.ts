import { auth } from "@/lib/auth";
import { checkStoreAdminAccess } from "@/lib/store-access";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

// gate keeper for store admin api access
// Returns { success: true, userId: string } on success, or NextResponse on failure
export async function CheckStoreAdminApiAccess(
	storeId: string,
): Promise<{ success: true; userId: string } | NextResponse> {
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

		// Align with store admin UI: owner, org member (owner/storeAdmin/staff), or global admin.
		const store = await checkStoreAdminAccess(
			storeId,
			userId,
			session?.user?.role ?? undefined,
		);

		if (!store) {
			return new NextResponse("Forbidden: no access to this store", {
				status: 403,
			});
		}

		return { success: true, userId };
	} catch (error) {
		logger.error("checkaccess", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api", "error"],
		});

		return new NextResponse("Unauthorized", { status: 403 });
	}
}
