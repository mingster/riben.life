import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getStoreHomeDataAction } from "@/actions/store/get-store-home-data";
import { getT } from "@/app/i18n";
import { WaitlistJoinClient } from "@/app/s/[storeId]/waitlist/components/waitlist-join-client";
import LineLoginButton from "@/components/auth/button-line-login";
import { Loader } from "@/components/loader";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import Container from "@/components/ui/container";
import { checkStoreAdminAccess } from "@/lib/store-access";
import { sqlClient } from "@/lib/prismadb";
import { resolveWaitlistJoinEligibility } from "@/lib/waitlist/session";
import { CustomerStoreBasePathProvider } from "@/providers/customer-store-base-path";
import type { Store } from "@/types";
import { buildLineAddFriendUrl } from "@/utils/line-add-friend-url";
import { LiffStoreCustomerShell } from "../components/liff-store-customer-shell";

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

	const { store, rsvpSettings, storeSettings, waitListSettings } = result.data;
	const waitlistEnabled = Boolean(waitListSettings?.enabled);
	const waitlistRequireSignIn = Boolean(waitListSettings?.requireSignIn);
	const waitlistRequireName = Boolean(waitListSettings?.requireName);
	const waitlistRequirePhone = Boolean(waitListSettings?.requirePhone);
	const showQueueOnWaitlistPage = Boolean(
		waitListSettings?.showQueueOnWaitlistPage,
	);

	const session = await getSessionSafely();
	const userId = session?.user?.id;

	let prefillPhone: string | null = null;
	let prefillName: string | null = null;
	if (userId) {
		const user = await sqlClient.user.findUnique({
			where: { id: userId },
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
	const joinResolved = resolveWaitlistJoinEligibility({
		businessHoursJson: storeSettings?.businessHours ?? null,
		useBusinessHours: storeHoursMeta?.useBusinessHours ?? true,
		defaultTimezone: tz,
		canGetNumBefore: waitListSettings?.canGetNumBefore ?? 0,
	});
	const waitlistAcceptingJoins = joinResolved.ok && waitlistEnabled;
	const lineAddFriendUrl = buildLineAddFriendUrl(storeSettings?.lineId);

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

	const { t } = await getT();

	const waitlistBody =
		waitlistRequireSignIn && !userId ? (
			<Container className="py-10">
				<Card>
					<CardHeader>
						<CardTitle className="text-xl font-semibold">
							{store.name}
						</CardTitle>
						<CardDescription>
							{t("waitlist_sign_in_required") ||
								"Please sign in to join the waitlist."}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<LineLoginButton
							callbackUrl={canonicalWaitlist}
							className="h-10 w-full touch-manipulation sm:h-9"
						/>
					</CardContent>
				</Card>
			</Container>
		) : (
			<WaitlistJoinClient
				storeId={store.id}
				storeName={store.name}
				waitlistEnabled={waitlistEnabled}
				waitlistRequireSignIn={waitlistRequireSignIn}
				waitlistRequireName={waitlistRequireName}
				waitlistRequirePhone={waitlistRequirePhone}
				prefillPhone={prefillPhone}
				prefillName={prefillName}
				waitlistAcceptingJoins={waitlistAcceptingJoins}
				lineAddFriendUrl={lineAddFriendUrl}
				currentSessionBlock={joinResolved.ok ? joinResolved.sessionBlock : null}
				showQueueOnWaitlistPage={showQueueOnWaitlistPage}
				postQueueSecondaryAction={{
					href: `${customerNavPrefix}/menu`,
					labelKey: "waitlist_place_order",
				}}
			/>
		);

	return (
		<CustomerStoreBasePathProvider value={customerNavPrefix}>
			<LiffStoreCustomerShell
				store={storeForMenu}
				routeStoreId={store.id}
				showStoreAdminLink={showStoreAdminLink}
				customerNavPrefix={customerNavPrefix}
			>
				<Suspense fallback={<Loader />}>{waitlistBody}</Suspense>
			</LiffStoreCustomerShell>
		</CustomerStoreBasePathProvider>
	);
}
