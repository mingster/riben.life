import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getStoreHomeDataAction } from "@/actions/store/get-store-home-data";
import { Loader } from "@/components/loader";
import { hasLineLinkedAccountForUser } from "@/lib/store/waitlist/has-line-linked-account";
import { checkStoreAdminAccess } from "@/lib/store-access";
import { CustomerStoreBasePathProvider } from "@/providers/customer-store-base-path";
import type { Store } from "@/types";
import { LiffStoreCustomerShell } from "../components/liff-store-customer-shell";
import { LiffWaitlistClient } from "./components/liff-waitlist-client";

type SearchParams = Promise<{ storeId?: string | string[] }>;

async function getSessionSafely() {
	try {
		const [{ auth: authMod }, headersList] = await Promise.all([
			import("@/lib/auth"),
			headers(),
		]);
		return await authMod.api.getSession({ headers: headersList });
	} catch {
		return null;
	}
}

/**
 * LIFF waitlist entry: `/liff/waitlist?storeId=…` (matches riben.life + bottom-nav links).
 */
export default async function LiffWaitlistPage(props: {
	searchParams: SearchParams;
}) {
	const sp = await props.searchParams;
	const raw = sp.storeId;
	const rawStoreId = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
	if (!rawStoreId) {
		redirect("/unv");
	}

	const result = await getStoreHomeDataAction({ storeId: rawStoreId });
	if (result?.serverError || !result?.data) {
		redirect("/unv");
	}

	const { store, rsvpSettings, waitListSettings } = result.data;

	const wl = waitListSettings;
	const waitlistPublicProps =
		wl != null
			? {
					enabled: wl.enabled === true,
					requireSignIn: wl.requireSignIn === true,
					requireName: wl.requireName === true,
					requireLineOnly: wl.requireLineOnly === true,
				}
			: null;

	const session = await getSessionSafely();
	const userId = session?.user?.id;

	const hasLineLinkedAccount =
		typeof userId === "string"
			? await hasLineLinkedAccountForUser(userId)
			: false;

	let showStoreAdminLink = false;
	if (typeof userId === "string") {
		const accessible = await checkStoreAdminAccess(
			store.id,
			userId,
			session?.user?.role ?? undefined,
		);
		showStoreAdminLink = Boolean(accessible);
	}

	const customerNavPrefix = `/liff/${store.id}`;
	const storeForMenu = {
		...store,
		rsvpSettings,
		waitListSettings,
	} as unknown as Store;

	const canonicalWaitlist = `/liff/waitlist?storeId=${encodeURIComponent(store.id)}`;

	return (
		<CustomerStoreBasePathProvider value={customerNavPrefix}>
			<LiffStoreCustomerShell
				store={storeForMenu}
				routeStoreId={store.id}
				showStoreAdminLink={showStoreAdminLink}
				customerNavPrefix={customerNavPrefix}
			>
				<Suspense fallback={<Loader />}>
					<LiffWaitlistClient
						storeId={store.id}
						storeName={store.name}
						waitListSettings={waitlistPublicProps}
						isSignedIn={Boolean(userId)}
						hasLineLinkedAccount={hasLineLinkedAccount}
						signInCallbackPath={canonicalWaitlist}
					/>
				</Suspense>
			</LiffStoreCustomerShell>
		</CustomerStoreBasePathProvider>
	);
}
