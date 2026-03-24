import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireAuth } from "@/lib/auth-utils";

// this is the main layout for store admin.
// Only sign-in user can access storeAdmin routes
// if the user can access a store (owner or org staff/storeAdmin), redirect to /storeAdmin/[storeId]
// if they have no such store, show the create store modal (via page.tsx)
export default async function StoreAdminLayout(props: {
	children: React.ReactNode;
	params: Promise<Record<string, never>>;
}) {
	await props.params;

	const { children } = props;

	// Require authentication
	const session = await requireAuth();
	const userId = session.user.id;
	if (typeof userId !== "string" || userId.length === 0) {
		redirect("/signIn");
	}

	const LAST_SELECTED_STORE_KEY = "lastSelectedStoreId";
	const cookieStore = await cookies();
	const lastSelectedStoreId = cookieStore.get(LAST_SELECTED_STORE_KEY)?.value;

	const { checkStoreAdminAccess, findFirstAccessibleStoreForUser } =
		await import("@/lib/store-access");

	// if cookie exists, verify store exists AND user has access before redirecting
	// This prevents redirect loops when store is deleted or access is denied
	if (lastSelectedStoreId) {
		const accessible = await checkStoreAdminAccess(
			lastSelectedStoreId,
			userId,
			session.user.role ?? undefined,
		);

		if (accessible) {
			redirect(`/storeAdmin/${lastSelectedStoreId}`);
		}
	}

	// Redirect to first store the user can open in store admin (owner or org staff/storeAdmin/owner member)
	const store = await findFirstAccessibleStoreForUser(
		userId,
		session.user.role ?? undefined,
	);

	if (store) {
		redirect(`/storeAdmin/${store.id}`);
	}

	return <>{children}</>;
}
