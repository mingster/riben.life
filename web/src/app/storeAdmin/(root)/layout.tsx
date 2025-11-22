import { sqlClient } from "@/lib/prismadb";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { requireAuthWithRole } from "@/lib/auth-utils";

// this is the main layout for store admin.
// Only owner, staff, or storeAdmin roles can access storeAdmin routes
// if the user has a store, redirect to the store dashboard (/storeAdmin/[storeId])
// if the user doesn't have store, show the create store modal (via page.tsx)
export default async function StoreAdminLayout(props: {
	children: React.ReactNode;
	params: Promise<{}>;
}) {
	const params = await props.params;

	const { children } = props;

	// Require authentication with allowed roles (owner, staff, or storeAdmin)
	// sysAdmin cannot access storeAdmin routes
	const session = await requireAuthWithRole([
		Role.owner,
		Role.staff,
		Role.storeAdmin,
	]);

	//const ownerId = session.user?.id;
	//console.log('userid: ' + userId);

	const LAST_SELECTED_STORE_KEY = "lastSelectedStoreId";
	const cookieStore = await cookies();
	const lastSelectedStoreId = cookieStore.get(LAST_SELECTED_STORE_KEY)?.value;

	// if cookie exists, redirect to the last selected store
	if (lastSelectedStoreId) {
		redirect(`/storeAdmin/${lastSelectedStoreId}`);
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
