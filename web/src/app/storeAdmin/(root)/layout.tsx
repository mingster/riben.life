import { sqlClient } from "@/lib/prismadb";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "@/lib/auth-utils";

// this is the main layout for store admin.
// Only sign-in user can access storeAdmin routes
// if the user has a store, redirect to the store dashboard (/storeAdmin/[storeId])
// if the user doesn't have store, show the create store modal (via page.tsx)
export default async function StoreAdminLayout(props: {
	children: React.ReactNode;
	params: Promise<{}>;
}) {
	const params = await props.params;

	const { children } = props;

	// Require authentication
	const session = await requireAuth();

	const LAST_SELECTED_STORE_KEY = "lastSelectedStoreId";
	const cookieStore = await cookies();
	const lastSelectedStoreId = cookieStore.get(LAST_SELECTED_STORE_KEY)?.value;

	// if cookie exists, verify store exists AND user has access before redirecting
	// This prevents redirect loops when store is deleted or access is denied
	if (lastSelectedStoreId) {
		// Check both store existence and user access
		// This prevents loops when store exists but user doesn't have access
		const { checkStoreOwnership } = await import("@/lib/store-access");
		const hasAccess = await checkStoreOwnership(
			lastSelectedStoreId,
			session.user.id,
			session.user.role ?? undefined,
		);

		// Only redirect if user has access to the store
		// If no access, don't redirect - show store selection page
		// This breaks the redirect loop: access check redirects here,
		// but if no access, we don't redirect again
		if (hasAccess) {
			redirect(`/storeAdmin/${lastSelectedStoreId}`);
		}
		// If no access, don't redirect - show store selection page
	}

	// if no cookie exists, redirect to user's first store
	// Note: For staff/storeAdmin roles, store access is validated per-store via checkStoreStaffAccess()
	// This query only finds stores where user is owner for convenience redirect
	const store = await sqlClient.store.findFirst({
		where: {
			ownerId: session.user.id,
			isDeleted: false,
		},
	});

	// if user has only one store, redirect to the store dashboard
	if (store) {
		redirect(`/storeAdmin/${store.id}`);
	}

	return <>{children}</>;
}
