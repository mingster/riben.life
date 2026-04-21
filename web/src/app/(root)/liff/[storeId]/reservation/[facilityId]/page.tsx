import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { FacilityReservationClient } from "@/app/s/[storeId]/reservation/[facilityId]/components/facility-reservation-client";
import {
	facilityReservationRsvpArgs,
	type FacilityReservationRsvpRow,
} from "@/app/s/[storeId]/reservation/[facilityId]/facility-reservation-query-types";
import { Loader } from "@/components/loader";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import type { Rsvp, User } from "@/types";
import { dateToEpoch, getUtcNow } from "@/utils/datetime-utils";
import { transformPrismaDataForJson } from "@/utils/utils";

import { getCachedLiffStoreHomeData } from "../../get-cached-liff-store-home-data";

type Params = Promise<{ storeId: string; facilityId: string }>;

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

export default async function LiffFacilityReservationPage(props: {
	params: Params;
}) {
	const { storeId, facilityId } = await props.params;

	const homeData = await getCachedLiffStoreHomeData(storeId);
	if (!homeData) redirect("/unv");

	const { store, rsvpSettings, storeSettings } = homeData;

	if (!rsvpSettings.acceptReservation) redirect(`/liff/${storeId}`);

	const now = getUtcNow();
	const rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const rangeEnd = new Date(
		now.getFullYear(),
		now.getMonth() + 2,
		0,
		23,
		59,
		59,
	);
	const rangeStartEpoch = dateToEpoch(rangeStart);
	const rangeEndEpoch = dateToEpoch(rangeEnd);

	if (!rangeStartEpoch || !rangeEndEpoch) {
		redirect(`/liff/${storeId}`);
	}

	let facility: Awaited<
		ReturnType<typeof sqlClient.storeFacility.findUnique>
	> | null = null;
	let existingReservations: FacilityReservationRsvpRow[] = [];
	let user: User | null = null;
	let isBlacklisted = false;

	try {
		const session = await getSessionSafely();

		const [facilityResult, rsvpsResult] = await Promise.all([
			sqlClient.storeFacility.findUnique({ where: { id: facilityId } }),
			sqlClient.rsvp.findMany({
				where: {
					storeId: store.id,
					rsvpTime: { gte: rangeStartEpoch, lte: rangeEndEpoch },
				},
				...facilityReservationRsvpArgs,
				orderBy: { rsvpTime: "asc" },
			}),
		]);

		facility = facilityResult;
		existingReservations = rsvpsResult;

		if (!facility || facility.storeId !== store.id) {
			redirect(`/liff/${storeId}`);
		}

		if (session?.user?.id) {
			const [userResult, blacklistEntry] = await Promise.all([
				sqlClient.user.findUnique({ where: { id: session.user.id } }),
				sqlClient.rsvpBlacklist.findFirst({
					where: { storeId: store.id, userId: session.user.id },
					select: { id: true },
				}),
			]);
			user = userResult as User | null;
			isBlacklisted = Boolean(blacklistEntry);
		}

		transformPrismaDataForJson(facility);
	} catch (error) {
		logger.error("Failed to load LIFF facility reservation page", {
			metadata: {
				storeId,
				facilityId,
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["reservation", "liff", "error"],
		});
		redirect(`/liff/${storeId}`);
	}

	const formattedRsvps: Rsvp[] = existingReservations.map((rsvp) => {
		const t = { ...rsvp };
		transformPrismaDataForJson(t);
		return t as Rsvp;
	});

	return (
		<Suspense fallback={<Loader />}>
			<FacilityReservationClient
				storeId={store.id}
				facility={facility!}
				existingReservations={formattedRsvps}
				rsvpSettings={rsvpSettings}
				storeSettings={storeSettings}
				user={user}
				storeTimezone={store.defaultTimezone || "Asia/Taipei"}
				storeCurrency={store.defaultCurrency || "twd"}
				storeUseBusinessHours={store.useBusinessHours ?? true}
				isBlacklisted={isBlacklisted}
				useCustomerCredit={store.useCustomerCredit || false}
				creditExchangeRate={
					store.creditExchangeRate ? Number(store.creditExchangeRate) : null
				}
				creditServiceExchangeRate={
					store.creditServiceExchangeRate
						? Number(store.creditServiceExchangeRate)
						: null
				}
			/>
		</Suspense>
	);
}
