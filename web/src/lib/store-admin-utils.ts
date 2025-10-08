import checkStoreAdminAccess from "@/actions/storeAdmin/check-store-access";
import isProLevel from "@/actions/storeAdmin/is-pro-level";
import { auth } from "@/lib/auth";
import { transformDecimalsToNumbers } from "@/utils/utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

// NOTE - protect storeAdmin route by redirect user to appropriate routes.
// Using React cache to deduplicate calls within the same request
// This ensures only one database query even if multiple components call it
export const checkStoreStaffAccess = cache(async (storeId: string) => {
	const headersList = await headers();
	const session = await auth.api.getSession({
		headers: headersList,
	});

	if (!session) {
		console.log("no session");
		redirect(`/signin?callbackUrl=/storeAdmin/${storeId}`);
	}

	// Check if user has admin/owner role
	if (session.user.role !== "owner" && session.user.role !== "admin") {
		console.log("access denied - insufficient role");
		redirect("/error/?code=403");
	}

	if (!session?.user?.id) {
		console.log("no session or userId");
		// Get the current path from headers to preserve the full URL for callback
		const pathname =
			headersList.get("x-current-path") || `/storeAdmin/${storeId}`;
		const callbackUrl = encodeURIComponent(pathname);
		redirect(`/signin?callbackUrl=${callbackUrl}`);
	}

	const store = await checkStoreAdminAccess(storeId, session.user.id);

	if (!store) {
		console.log("store not found or access denied");
		redirect("/storeAdmin");
	}

	transformDecimalsToNumbers(store);

	return store;
});

// return true if this store level is not free
export const isPro = async (storeId: string) => {
	return await isProLevel(storeId);
};
