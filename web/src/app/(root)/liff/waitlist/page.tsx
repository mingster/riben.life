import { getStoreHomeDataAction } from "@/actions/store/get-store-home-data";
import { Loader } from "@/components/loader";
import { sqlClient } from "@/lib/prismadb";
import { checkStoreAdminAccess } from "@/lib/store-access";
import { CustomerStoreBasePathProvider } from "@/providers/customer-store-base-path";
import type { Store } from "@/types";
import { buildLineAddFriendUrl } from "@/utils/line-add-friend-url";
import { resolveWaitlistSessionBlock } from "@/utils/waitlist-session";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LiffStoreCustomerShell } from "../components/liff-store-customer-shell";
import { LiffWaitlistJoinClient } from "./components/liff-waitlist-join-client";

type SearchParams = Promise<{ storeId?: string }>;

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

/**
 * LIFF-only waitlist entry: `/liff/waitlist?storeId={storeId}`.
 * Data loading mirrors `s/[storeId]/waitlist/page.tsx`; chrome matches `/liff/[storeId]`.
 */
export default async function LiffWaitlistPage(props: {
	searchParams: SearchParams;
}) {
	const sp = await props.searchParams;
	const rawStoreId = sp.storeId?.trim() ?? "";
	if (!rawStoreId) {
		redirect("/unv");
	}

	const result = await getStoreHomeDataAction({ storeId: rawStoreId });
	if (result?.serverError || !result?.data) {
		redirect("/unv");
	}

	const { store, rsvpSettings, storeSettings: homeStoreSettings } = result.data;
	const waitlistEnabled = rsvpSettings?.waitlistEnabled === true;
	const waitlistRequireSignIn = rsvpSettings?.waitlistRequireSignIn === true;
	const waitlistRequireName = rsvpSettings?.waitlistRequireName === true;

	let prefillPhone: string | null = null;
	let prefillName: string | null = null;
	const session = await getSessionSafely();
	if (session?.user?.id) {
		const user = await sqlClient.user.findUnique({
			where: { id: session.user.id },
			select: { phoneNumber: true, name: true },
		});
		prefillPhone = user?.phoneNumber ?? null;
		prefillName = user?.name?.trim() || null;
	}

	const storeHoursMeta = await sqlClient.store.findUnique({
		where: { id: store.id },
		select: { useBusinessHours: true, defaultTimezone: true },
	});
	const tz = storeHoursMeta?.defaultTimezone || "Asia/Taipei";
	const sessionResolved = resolveWaitlistSessionBlock({
		businessHoursJson: homeStoreSettings?.businessHours ?? null,
		useBusinessHours: storeHoursMeta?.useBusinessHours ?? true,
		defaultTimezone: tz,
	});
	const waitlistAcceptingJoins =
		!("closed" in sessionResolved) && waitlistEnabled;
	const lineAddFriendUrl = buildLineAddFriendUrl(homeStoreSettings?.lineId);

	let showStoreAdminLink = false;
	if (session?.user?.id) {
		const accessible = await checkStoreAdminAccess(
			store.id,
			session.user.id,
			session.user.role ?? undefined,
		);
		showStoreAdminLink = Boolean(accessible);
	}

	const customerNavPrefix = `/liff/${store.id}`;
	const storeForMenu = { ...store, rsvpSettings } as unknown as Store;

	return (
		<CustomerStoreBasePathProvider value={customerNavPrefix}>
			<LiffStoreCustomerShell
				store={storeForMenu}
				routeStoreId={store.id}
				showStoreAdminLink={showStoreAdminLink}
				customerNavPrefix={customerNavPrefix}
			>
				<Suspense fallback={<Loader />}>
					<LiffWaitlistJoinClient
						storeId={store.id}
						storeName={store.name}
						waitlistEnabled={waitlistEnabled}
						waitlistRequireSignIn={waitlistRequireSignIn}
						waitlistRequireName={waitlistRequireName}
						prefillPhone={prefillPhone}
						prefillName={prefillName}
						waitlistAcceptingJoins={waitlistAcceptingJoins}
						lineAddFriendUrl={lineAddFriendUrl}
						currentSessionBlock={
							"closed" in sessionResolved ? null : sessionResolved.block
						}
					/>
				</Suspense>
			</LiffStoreCustomerShell>
		</CustomerStoreBasePathProvider>
	);
}
