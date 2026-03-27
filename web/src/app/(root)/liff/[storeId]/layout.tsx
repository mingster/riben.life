import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isReservedRoute } from "@/lib/reserved-routes";
import { checkStoreAdminAccess } from "@/lib/store-access";
import { CustomerStoreBasePathProvider } from "@/providers/customer-store-base-path";
import type { Store } from "@/types";

import { LiffStoreCustomerShell } from "../components/liff-store-customer-shell";
import { getCachedLiffStoreHomeData } from "./get-cached-liff-store-home-data";

type Props = {
	children: React.ReactNode;
	params: Promise<{ storeId: string }>;
};

async function getSessionSafely() {
	try {
		const [{ auth }, headersList] = await Promise.all([
			import("@/lib/auth"),
			headers(),
		]);
		return await auth.api.getSession({ headers: headersList });
	} catch {
		return null;
	}
}

export default async function LiffStoreSegmentLayout(props: Props) {
	const { storeId: rawStoreId } = await props.params;
	const storeId = rawStoreId?.trim() ?? "";

	if (!storeId || isReservedRoute(storeId)) {
		notFound();
	}

	const data = await getCachedLiffStoreHomeData(storeId);
	if (!data) {
		redirect("/unv");
	}

	const { store, rsvpSettings } = data;
	const customerNavPrefix = `/liff/${storeId}`;

	const session = await getSessionSafely();
	let showStoreAdminLink = false;
	if (session?.user?.id) {
		const accessible = await checkStoreAdminAccess(
			store.id,
			session.user.id,
			session.user.role ?? undefined,
		);
		showStoreAdminLink = Boolean(accessible);
	}

	const storeForMenu = { ...store, rsvpSettings } as unknown as Store;

	return (
		<CustomerStoreBasePathProvider value={customerNavPrefix}>
			<LiffStoreCustomerShell
				store={storeForMenu}
				routeStoreId={store.id}
				showStoreAdminLink={showStoreAdminLink}
				customerNavPrefix={customerNavPrefix}
			>
				{props.children}
			</LiffStoreCustomerShell>
		</CustomerStoreBasePathProvider>
	);
}
