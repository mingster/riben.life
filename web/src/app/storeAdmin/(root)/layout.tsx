import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireAuth } from "@/lib/auth-utils";
import {
	checkStoreAdminAccess,
	findFirstAccessibleStoreForUser,
} from "@/lib/store-access";

const LAST_SELECTED_STORE_KEY = "lastSelectedStoreId";

export default async function StoreAdminRootLayout(props: {
	children: React.ReactNode;
	params: Promise<Record<string, never>>;
}) {
	await props.params;

	const { children } = props;

	const session = await requireAuth();
	const userId = session.user.id;
	if (typeof userId !== "string" || userId.length === 0) {
		redirect("/signIn");
	}

	const cookieStore = await cookies();
	const lastSelectedStoreId = cookieStore.get(LAST_SELECTED_STORE_KEY)?.value;

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

	const store = await findFirstAccessibleStoreForUser(
		userId,
		session.user.role ?? undefined,
	);

	if (store) {
		redirect(`/storeAdmin/${store.id}`);
	}

	return <>{children}</>;
}
