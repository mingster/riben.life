import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { auth } from "@/lib/auth";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import type {
	Rsvp,
	RsvpSettings,
	Store,
	StoreFacility,
	StoreSettings,
	User,
} from "@/types";
import { dateToEpoch, getUtcNow } from "@/utils/datetime-utils";
import { isValidGuid } from "@/utils/guid-utils";
import { transformPrismaDataForJson } from "@/utils/utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FacilityReservationClient } from "./components/facility-reservation-client";

type Params = Promise<{ storeId: string; facilityId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function FacilityReservationPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Get session to check if user is logged in
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	// Get current date range for fetching existing reservations (current month ± 1 month)
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

	// Convert to epoch for database query
	const rangeStartEpoch = dateToEpoch(rangeStart);
	const rangeEndEpoch = dateToEpoch(rangeEnd);
	if (!rangeStartEpoch || !rangeEndEpoch) {
		logger.error("Invalid date range for RSVP query", {
			metadata: { rangeStart, rangeEnd },
			tags: ["reservation", "error"],
		});
		redirect("/unv");
	}

	// Fetch all data in parallel
	let store: Store | null;
	let rsvpSettings: RsvpSettings | null;
	let facility: StoreFacility | null;
	let existingReservations: Rsvp[];
	let storeSettings: StoreSettings | null;
	let user: User | null = null;
	let formattedRsvps: Rsvp[] = [];
	let isBlacklisted = false;

	try {
		// Find store by ID (UUID) or name
		const isUuid = isValidGuid(params.storeId);
		const storeResult = await sqlClient.store.findFirst({
			where: isUuid
				? { id: params.storeId }
				: { name: { equals: params.storeId, mode: "insensitive" } },
			select: {
				id: true,
				name: true,
				ownerId: true,
				defaultTimezone: true,
				defaultCurrency: true,
				useBusinessHours: true,
				useCustomerCredit: true,
				creditExchangeRate: true,
				creditServiceExchangeRate: true,
			},
		});

		store = storeResult;

		if (!store) {
			logger.error("Store not found", {
				metadata: { storeId: params.storeId },
				tags: ["reservation", "error"],
			});
			redirect("/unv");
		}

		const actualStoreId = store.id;

		// Fetch settings, facility, and RSVPs in parallel
		const [
			rsvpSettingsResult,
			facilityResult,
			rsvpsResult,
			storeSettingsResult,
		] = await Promise.all([
			sqlClient.rsvpSettings.findFirst({
				where: { storeId: actualStoreId },
			}),
			sqlClient.storeFacility.findUnique({
				where: { id: params.facilityId },
			}),
			sqlClient.rsvp.findMany({
				where: {
					storeId: actualStoreId,
					rsvpTime: {
						gte: rangeStartEpoch,
						lte: rangeEndEpoch,
					},
				},
				include: {
					Store: true,
					Customer: true,
					CreatedBy: true,
					Order: true,
					Facility: true,
					FacilityPricingRule: true,
					ServiceStaff: {
						select: {
							id: true,
							businessHours: true,
							User: {
								select: {
									id: true,
									name: true,
								},
							},
						},
					},
				},
				orderBy: { rsvpTime: "asc" },
			}),
			sqlClient.storeSettings.findFirst({
				where: { storeId: actualStoreId },
			}),
		]);

		rsvpSettings = rsvpSettingsResult;
		facility = facilityResult;
		existingReservations = rsvpsResult;
		storeSettings = storeSettingsResult;

		// Fetch user and check blacklist (only if logged in)
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

		// Validate facility exists and belongs to store
		if (!facility || facility.storeId !== actualStoreId) {
			logger.error("Facility not found or doesn't belong to store", {
				metadata: { storeId: actualStoreId, facilityId: params.facilityId },
				tags: ["reservation", "error"],
			});
			redirect(`/s/${params.storeId}`);
		}

		// Check if reservations are accepted
		if (!rsvpSettings || !rsvpSettings.acceptReservation) {
			logger.warn("Reservations not accepted for store", {
				metadata: { storeId: params.storeId },
				tags: ["reservation", "warning"],
			});
			redirect(`/s/${params.storeId}`);
		}

		// Transform data for JSON serialization
		transformPrismaDataForJson(store);
		if (facility) {
			transformPrismaDataForJson(facility);
		}
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
		logger.error("Failed to load facility reservation page", {
			metadata: {
				storeId: params.storeId,
				facilityId: params.facilityId,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			},
			tags: ["reservation", "error"],
		});
		redirect("/unv");
	}

	return (
		<Container>
			<Suspense fallback={<Loader />}>
				<FacilityReservationClient
					storeId={params.storeId}
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
		</Container>
	);
}
