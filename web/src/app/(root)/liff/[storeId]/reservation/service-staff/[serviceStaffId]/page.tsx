import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PersonnelServiceStaffReservationClient } from "@/app/s/[storeId]/reservation/[facilityId]/components/personnel-service-staff-reservation-client";
import {
	facilityReservationRsvpArgs,
	type FacilityReservationRsvpRow,
} from "@/app/s/[storeId]/reservation/[facilityId]/facility-reservation-query-types";
import { Loader } from "@/components/loader";
import { getServiceStaffData } from "@/lib/service-staff";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import type { Rsvp, StoreFacility, User } from "@/types";
import { RsvpMode } from "@/types/enum";
import { dateToEpoch, getUtcNow } from "@/utils/datetime-utils";
import { transformPrismaDataForJson } from "@/utils/utils";

import { getCachedLiffStoreHomeData } from "../../../get-cached-liff-store-home-data";

type Params = Promise<{ storeId: string; serviceStaffId: string }>;

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

export default async function LiffServiceStaffReservationPage(props: {
	params: Params;
}) {
	const { storeId, serviceStaffId } = await props.params;

	const homeData = await getCachedLiffStoreHomeData(storeId);
	if (!homeData) redirect("/unv");

	const { store, rsvpSettings, storeSettings } = homeData;

	if (!rsvpSettings.acceptReservation) redirect(`/liff/${storeId}`);
	if (Number(rsvpSettings.rsvpMode) !== RsvpMode.PERSONNEL) {
		redirect(`/liff/${storeId}`);
	}

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

	let existingReservations: FacilityReservationRsvpRow[] = [];
	let user: User | null = null;
	let isBlacklisted = false;
	let facilitiesForPersonnelPicker: StoreFacility[] = [];

	try {
		const session = await getSessionSafely();

		const [staffList, rsvpsResult] = await Promise.all([
			getServiceStaffData(store.id, {}),
			sqlClient.rsvp.findMany({
				where: {
					storeId: store.id,
					rsvpTime: { gte: rangeStartEpoch, lte: rangeEndEpoch },
				},
				...facilityReservationRsvpArgs,
				orderBy: { rsvpTime: "asc" },
			}),
		]);

		existingReservations = rsvpsResult;

		const staffColumn = staffList.find((s) => s.id === serviceStaffId) ?? null;

		if (!staffColumn || staffColumn.capacity <= 0) {
			redirect(`/liff/${storeId}/reservation`);
		}

		if (rsvpSettings.mustSelectFacility) {
			const facilityRows = await sqlClient.storeFacility.findMany({
				where: { storeId: store.id },
				orderBy: { facilityName: "asc" },
			});
			transformPrismaDataForJson(facilityRows);
			facilitiesForPersonnelPicker = facilityRows as StoreFacility[];
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

		const formattedRsvps: Rsvp[] = existingReservations.map((rsvp) => {
			const t = { ...rsvp };
			transformPrismaDataForJson(t);
			return t as Rsvp;
		});

		const cap = rsvpSettings.maxCapacity ?? 0;
		const virtualFacility = {
			id: `${store.id}-staff-booking`,
			storeId: store.id,
			facilityName:
				staffColumn.userName ||
				staffColumn.userEmail ||
				store.name ||
				"Reservation",
			capacity: cap > 0 ? cap : Math.max(1, staffColumn.capacity || 10),
			defaultCost: 0,
			defaultCredit: 0,
			defaultDuration: rsvpSettings.defaultDuration ?? 60,
			useOwnBusinessHours: false,
			businessHours: null,
			description: staffColumn.description,
			location: null,
			travelInfo: null,
		} as StoreFacility;

		return (
			<Suspense fallback={<Loader />}>
				<PersonnelServiceStaffReservationClient
					storeId={store.id}
					facility={virtualFacility}
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
					storeLabelForHeader={
						staffColumn.userName ||
						staffColumn.userEmail ||
						store.name ||
						undefined
					}
					prefilledServiceStaffId={staffColumn.id}
					facilitiesForPersonnelPicker={facilitiesForPersonnelPicker}
				/>
			</Suspense>
		);
	} catch (error) {
		logger.error("Failed to load LIFF service staff reservation page", {
			metadata: {
				storeId,
				serviceStaffId,
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["reservation", "liff", "error"],
		});
		redirect(`/liff/${storeId}`);
	}
}
