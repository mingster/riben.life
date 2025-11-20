import { auth, Session } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import logger from "@/lib/logger";

// this is the main layout for store admin.
// if the user has a store, redirect to the store dashboard (/storeAdmin/[storeId])
// if the user doesn't have store, show the create store modal (via page.tsx)
export default async function StoreAdminLayout(props: {
	children: React.ReactNode;
	params: Promise<{}>;
}) {
	const params = await props.params;

	const { children } = props;

	const session = (await auth.api.getSession({
		headers: await headers(), // you need to pass the headers object.
	})) as unknown as Session;

	if (!session) {
		redirect(`/signin?callbackUrl=/storeAdmin`);
	}

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
