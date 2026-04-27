import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { auth } from "@/lib/auth";
import { getCustomerStoreBasePath } from "@/lib/customer-store-base-path";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import type {
	Rsvp,
	RsvpSettings,
	StoreFacility,
	StoreSettings,
	User,
} from "@/types";
import { RsvpMode } from "@/types/enum";
import { dateToEpoch, getUtcNow } from "@/utils/datetime-utils";
import { isValidGuid } from "@/utils/guid-utils";
import { transformPrismaDataForJson } from "@/utils/utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
	facilityReservationRsvpArgs,
	facilityReservationStoreArgs,
	type FacilityReservationRsvpRow,
	type FacilityReservationStoreSlice,
} from "../[facilityId]/facility-reservation-query-types";
import { RestaurantModeReservationClient } from "../[facilityId]/components/restaurant-mode-reservation-client";

type Params = Promise<{ storeId: string }>;

export default async function OpenReservationPage(props: { params: Params }) {
	const params = await props.params;
	const customerBase = await getCustomerStoreBasePath(params.storeId);

	const session = await auth.api.getSession({
		headers: await headers(),
	});

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
		logger.error("Invalid date range for RSVP query", {
			metadata: { rangeStart, rangeEnd },
			tags: ["reservation", "error"],
		});
		redirect("/unv");
	}

	let store: FacilityReservationStoreSlice | null;
	let rsvpSettings: RsvpSettings | null;
	let existingReservations: FacilityReservationRsvpRow[];
	let storeSettings: StoreSettings | null;
	let user: User | null = null;
	let formattedRsvps: Rsvp[] = [];
	let isBlacklisted = false;

	try {
		const isUuid = isValidGuid(params.storeId);
		const storeResult = await sqlClient.store.findFirst({
			where: isUuid
				? { id: params.storeId }
				: { name: { equals: params.storeId, mode: "insensitive" } },
			...facilityReservationStoreArgs,
		});
		store = storeResult;

		if (!store) {
			redirect("/unv");
		}

		const actualStoreId = store.id;

		const [rsvpSettingsResult, rsvpsResult, storeSettingsResult] =
			await Promise.all([
				sqlClient.rsvpSettings.findFirst({
					where: { storeId: actualStoreId },
				}),
				sqlClient.rsvp.findMany({
					where: {
						storeId: actualStoreId,
						rsvpTime: {
							gte: rangeStartEpoch,
							lte: rangeEndEpoch,
						},
					},
					...facilityReservationRsvpArgs,
					orderBy: { rsvpTime: "asc" },
				}),
				sqlClient.storeSettings.findFirst({
					where: { storeId: actualStoreId },
				}),
			]);

		rsvpSettings = rsvpSettingsResult;
		existingReservations = rsvpsResult;
		storeSettings = storeSettingsResult;

		if (!rsvpSettings?.acceptReservation) {
			redirect(`${customerBase}/reservation`);
		}

		if (Number(rsvpSettings.rsvpMode) !== RsvpMode.RESTAURANT) {
			redirect(`${customerBase}/reservation`);
		}

		if (session?.user?.id) {
			const [userResult, blacklistEntry] = await Promise.all([
				sqlClient.user.findUnique({
					where: { id: session.user.id },
				}),
				sqlClient.rsvpBlacklist.findFirst({
					where: {
						storeId: actualStoreId,
						userId: session.user.id,
					},
					select: { id: true },
				}),
			]);
			user = userResult as User | null;
			isBlacklisted = Boolean(blacklistEntry);
		}

		transformPrismaDataForJson(store);
		if (rsvpSettings) {
			transformPrismaDataForJson(rsvpSettings);
		}
		if (storeSettings) {
			transformPrismaDataForJson(storeSettings);
		}

		formattedRsvps = existingReservations.map((rsvp) => {
			const transformed = { ...rsvp };
			transformPrismaDataForJson(transformed);
			return transformed as Rsvp;
		});
	} catch (error) {
		logger.error("Failed to load open reservation page", {
			metadata: {
				storeId: params.storeId,
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["reservation", "error"],
		});
		redirect("/unv");
	}

	const cap = rsvpSettings?.maxCapacity ?? 0;
	const virtualFacility = {
		id: `${store!.id}-open-booking`,
		storeId: store!.id,
		facilityName: store!.name,
		capacity: cap > 0 ? cap : 50,
		defaultCost: 0,
		defaultCredit: 0,
		defaultDuration: rsvpSettings?.defaultDuration ?? 60,
		useOwnBusinessHours: false,
		businessHours: null,
		description: null,
		location: null,
		travelInfo: null,
	} as StoreFacility;

	return (
		<Container>
			<Suspense fallback={<Loader />}>
				<RestaurantModeReservationClient
					storeId={store!.id}
					facility={virtualFacility}
					existingReservations={formattedRsvps}
					rsvpSettings={rsvpSettings}
					storeSettings={storeSettings}
					user={user}
					storeTimezone={store!.defaultTimezone || "Asia/Taipei"}
					storeCurrency={store!.defaultCurrency || "twd"}
					storeUseBusinessHours={store!.useBusinessHours ?? true}
					isBlacklisted={isBlacklisted}
					useCustomerCredit={store!.useCustomerCredit || false}
					creditExchangeRate={
						store!.creditExchangeRate ? Number(store!.creditExchangeRate) : null
					}
					creditServiceExchangeRate={
						store!.creditServiceExchangeRate
							? Number(store!.creditServiceExchangeRate)
							: null
					}
					storeLabelForHeader={store!.name}
				/>
			</Suspense>
		</Container>
	);
}
