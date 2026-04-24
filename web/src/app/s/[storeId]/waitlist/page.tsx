import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getStoreHomeDataAction } from "@/actions/store/get-store-home-data";
import { Loader } from "@/components/loader";
import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { buildLineAddFriendUrl } from "@/utils/line-add-friend-url";
import { resolveWaitlistJoinEligibility } from "@/utils/waitlist-session";
import { WaitlistJoinClient } from "./components/waitlist-join-client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * 線上排隊系統
 * 掃QRcode、看菜單餐點、不必在場、自動通知、回餐廳、入座
 * 客人以手機掃描 QRcode 會來到此網址，登記後即可排隊。
 * 客人可以手機查看排隊狀況與等候時間
 *
 * https://menushop.tw/queue_system
 * @param props
 * @returns
 */
export default async function WaitlistPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	const result = await getStoreHomeDataAction({ storeId: params.storeId });

	if (result?.serverError || !result?.data) {
		redirect("/unv");
	}

	const {
		store,
		storeSettings: homeStoreSettings,
		waitListSettings,
	} = result.data;
	const waitlistEnabled = Boolean(waitListSettings?.enabled);
	const waitlistRequireSignIn = Boolean(waitListSettings?.requireSignIn);
	const waitlistRequireName = Boolean(waitListSettings?.requireName);
	const waitlistRequirePhone = Boolean(waitListSettings?.requirePhone);

	let prefillPhone: string | null = null;
	let prefillName: string | null = null;
	const session = await auth.api.getSession({
		headers: await headers(),
	});
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
	const joinResolved = resolveWaitlistJoinEligibility({
		businessHoursJson: homeStoreSettings?.businessHours ?? null,
		useBusinessHours: storeHoursMeta?.useBusinessHours ?? true,
		defaultTimezone: tz,
		canGetNumBefore: waitListSettings?.canGetNumBefore ?? 0,
	});
	const waitlistAcceptingJoins = joinResolved.ok && waitlistEnabled;
	const lineAddFriendUrl = buildLineAddFriendUrl(homeStoreSettings?.lineId);

	return (
		<Suspense fallback={<Loader />}>
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
			/>
		</Suspense>
	);
}
