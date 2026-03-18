import { getStoreHomeDataAction } from "@/actions/store/get-store-home-data";
import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { Loader } from "@/components/loader";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { resolveWaitlistSessionBlock } from "@/utils/waitlist-session";
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

	const { store, rsvpSettings } = result.data;
	const waitlistEnabled = rsvpSettings?.waitlistEnabled === true;
	const waitlistRequireSignIn = rsvpSettings?.waitlistRequireSignIn === true;

	let prefillPhone: string | null = null;
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (session?.user?.id) {
		const user = await sqlClient.user.findUnique({
			where: { id: session.user.id },
			select: { phoneNumber: true },
		});
		prefillPhone = user?.phoneNumber ?? null;
	}

	const [storeHoursMeta, storeSettings] = await Promise.all([
		sqlClient.store.findUnique({
			where: { id: store.id },
			select: { useBusinessHours: true, defaultTimezone: true },
		}),
		sqlClient.storeSettings.findUnique({
			where: { storeId: store.id },
			select: { businessHours: true },
		}),
	]);
	const tz = storeHoursMeta?.defaultTimezone || "Asia/Taipei";
	const sessionResolved = resolveWaitlistSessionBlock({
		businessHoursJson: storeSettings?.businessHours ?? null,
		useBusinessHours: storeHoursMeta?.useBusinessHours ?? true,
		defaultTimezone: tz,
	});
	const waitlistAcceptingJoins =
		!("closed" in sessionResolved) && waitlistEnabled;

	return (
		<Suspense fallback={<Loader />}>
			<WaitlistJoinClient
				storeId={store.id}
				storeName={store.name}
				waitlistEnabled={waitlistEnabled}
				waitlistRequireSignIn={waitlistRequireSignIn}
				prefillPhone={prefillPhone}
				waitlistAcceptingJoins={waitlistAcceptingJoins}
				currentSessionBlock={
					"closed" in sessionResolved ? null : sessionResolved.block
				}
			/>
		</Suspense>
	);
}
