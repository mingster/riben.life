"use client";

import { useTranslation } from "@/app/i18n/client";
import { Heading } from "@/components/ui/heading";
import { useI18n } from "@/providers/i18n-provider";
import type {
	Rsvp,
	RsvpSettings,
	StoreFacility,
	StoreSettings,
	User,
} from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CustomerWeekViewCalendar } from "./customer-week-view-calendar";
import { ReservationDialog } from "./reservation-dialog";

interface ReservationClientProps {
	existingReservations: Rsvp[];
	rsvpSettings: (RsvpSettings & { defaultCost?: number | null }) | null;
	storeSettings: StoreSettings | null;
	facilities: StoreFacility[];
	user: User | null;
	storeId: string;
	storeOwnerId: string;
	storeTimezone: string;
	storeCurrency?: string;
	storeUseBusinessHours?: boolean | null;
	isBlacklisted?: boolean;
	useCustomerCredit?: boolean;
	creditExchangeRate?: number | null;
	creditServiceExchangeRate?: number | null;
}

export function ReservationClient({
	existingReservations,
	rsvpSettings,
	storeSettings,
	facilities,
	user,
	storeId,
	storeOwnerId,
	storeTimezone,
	storeCurrency = "twd",
	storeUseBusinessHours,
	isBlacklisted = false,
	useCustomerCredit = false,
	creditExchangeRate = null,
	creditServiceExchangeRate = null,
}: ReservationClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const router = useRouter();
	const searchParams = useSearchParams();
	const [_selectedDateTime, setSelectedDateTime] = useState<{
		day: Date;
		timeSlot: string;
	} | null>(null);
	const [editRsvpId, setEditRsvpId] = useState<string | null>(null);
	const [editRsvp, setEditRsvp] = useState<Rsvp | null>(null);

	// Handle edit query parameter
	useEffect(() => {
		const editId = searchParams.get("edit");
		if (editId) {
			const rsvp = existingReservations.find((r) => r.id === editId);
			if (rsvp) {
				setEditRsvp(rsvp);
				setEditRsvpId(editId);
			}
		}
	}, [searchParams, existingReservations]);

	const handleReservationCreated = useCallback((newRsvp: Rsvp) => {
		// Reset selected date/time after successful creation
		setSelectedDateTime(null);
		// The calendar component handles updating its own state
		// This callback is just for any additional cleanup if needed
	}, []);

	// Helper to remove edit parameter from URL
	const removeEditParam = useCallback(() => {
		const params = new URLSearchParams(searchParams.toString());
		params.delete("edit");
		const newUrl = params.toString()
			? `${window.location.pathname}?${params.toString()}`
			: window.location.pathname;
		router.replace(newUrl, { scroll: false });
	}, [router, searchParams]);

	const handleReservationUpdated = useCallback(
		(updatedRsvp: Rsvp) => {
			// Close edit dialog
			setEditRsvp(null);
			setEditRsvpId(null);
			// Update URL to remove edit parameter
			removeEditParam();
		},
		[removeEditParam],
	);

	const prepaidRequired =
		(rsvpSettings?.minPrepaidPercentage ?? 0) > 0
			? t("store_reservation_required")
			: t("store_reservation_non-required");
	const hours = rsvpSettings?.cancelHours;

	return (
		<div className="flex flex-col gap-1">
			<Heading
				title={t("store_reservation_title")}
				description={t("store_reservation_descr", {
					prepaidRequired,
					hours: hours ?? 24,
				})}
			/>

			{/* Week View Calendar */}
			<CustomerWeekViewCalendar
				existingReservations={existingReservations}
				rsvpSettings={rsvpSettings}
				storeSettings={storeSettings}
				storeId={storeId}
				storeOwnerId={storeOwnerId}
				facilities={facilities}
				user={user}
				storeTimezone={storeTimezone}
				storeCurrency={storeCurrency}
				storeUseBusinessHours={storeUseBusinessHours}
				onReservationCreated={handleReservationCreated}
				isBlacklisted={isBlacklisted}
				useCustomerCredit={useCustomerCredit}
				creditExchangeRate={creditExchangeRate}
				creditServiceExchangeRate={creditServiceExchangeRate}
			/>

			{/* Edit Reservation Dialog */}
			{editRsvp && (
				<ReservationDialog
					storeId={storeId}
					rsvpSettings={rsvpSettings}
					storeSettings={storeSettings}
					facilities={facilities}
					user={user}
					rsvp={editRsvp}
					existingReservations={existingReservations}
					storeTimezone={storeTimezone}
					storeCurrency={storeCurrency}
					storeUseBusinessHours={storeUseBusinessHours}
					open={Boolean(editRsvpId)}
					onOpenChange={(open) => {
						if (!open) {
							setEditRsvp(null);
							setEditRsvpId(null);
							removeEditParam();
						}
					}}
					onReservationUpdated={handleReservationUpdated}
					useCustomerCredit={useCustomerCredit}
					creditExchangeRate={creditExchangeRate}
					creditServiceExchangeRate={creditServiceExchangeRate}
				/>
			)}
		</div>
	);
}
/*
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
import { ReservationClient } from "./components/client-reservation-weekview";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ReservationPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Get session to check if user is logged in
	const session = await auth.api.getSession({
		headers: await headers(),
	});


	const now = getUtcNow();
	const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
	const daysToSunday = dayOfWeek === 0 ? 0 : dayOfWeek;

	// Calculate week boundaries (Sunday to Saturday) in UTC
	const weekStart = new Date(
		Date.UTC(
			now.getUTCFullYear(),
			now.getUTCMonth(),
			now.getUTCDate() - daysToSunday,
			0,
			0,
			0,
			0,
		),
	);
	const weekEnd = new Date(
		Date.UTC(
			weekStart.getUTCFullYear(),
			weekStart.getUTCMonth(),
			weekStart.getUTCDate() + 6, // Saturday
			23,
			59,
			59,
			999,
		),
	);

	// Extend range by 2 weeks before and after
	const rangeStart = new Date(
		Date.UTC(
			weekStart.getUTCFullYear(),
			weekStart.getUTCMonth(),
			weekStart.getUTCDate() - 14,
			0,
			0,
			0,
			0,
		),
	);
	const rangeEnd = new Date(
		Date.UTC(
			weekEnd.getUTCFullYear(),
			weekEnd.getUTCMonth(),
			weekEnd.getUTCDate() + 14,
			23,
			59,
			59,
			999,
		),
	);

	// Convert to epoch for database query (validate conversion)
	const rangeStartEpoch = dateToEpoch(rangeStart);
	const rangeEndEpoch = dateToEpoch(rangeEnd);
	if (!rangeStartEpoch || !rangeEndEpoch) {
		logger.error("Invalid date range for RSVP query", {
			metadata: { rangeStart, rangeEnd },
			tags: ["reservation", "error"],
		});
		redirect("/unv");
	}

	// Fetch all data in parallel for better performance
	let store: Store | null;
	let rsvpSettings: RsvpSettings | null;
	let facilities: StoreFacility[];
	let existingReservations: Rsvp[];
	let storeSettings: StoreSettings | null;
	let user: User | null = null;
	let formattedRsvps: Rsvp[] = [];
	let isBlacklisted = false;

	try {
		// Find store by ID (UUID) or name
		// Try ID first if it looks like a UUID, otherwise try name
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

		// Early return if store not found
		if (!store) {
			logger.error("Store not found", {
				metadata: { storeId: params.storeId },
				tags: ["reservation", "error"],
			});
			redirect("/unv");
		}

		// Use the actual store ID for subsequent queries (in case we found by name)
		const actualStoreId = store.id;

		// Fetch settings, facilities, and RSVPs in parallel
		const [
			rsvpSettingsResult,
			facilitiesResult,
			rsvpsResult,
			storeSettingsResult,
		] = await Promise.all([
			sqlClient.rsvpSettings.findFirst({
				where: { storeId: actualStoreId },
			}),
			sqlClient.storeFacility.findMany({
				where: { storeId: actualStoreId },
				orderBy: { facilityName: "asc" },
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
		facilities = facilitiesResult;
		existingReservations = rsvpsResult;
		storeSettings = storeSettingsResult;

		// Fetch user and check blacklist in parallel (only if logged in)
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
					select: { id: true }, // Only need to check existence
				}),
			]);

			user = userResult as User | null;
			isBlacklisted = Boolean(blacklistEntry);
		}

		// Check if reservations are accepted
		if (!rsvpSettings || !rsvpSettings.acceptReservation) {
			logger.warn("Reservations not accepted for store", {
				metadata: { storeId: params.storeId },
				tags: ["reservation", "warning"],
			});
			// Still show the page but the form will handle the error
		}

		// Note: Anonymous users can now create pending RSVPs even when prepaid is required
		// They will be prompted to sign in and refill after creating the reservation

		// Transform BigInt (epoch timestamps) and Decimal to numbers for JSON serialization
		// Transform all data once before passing to client
		transformPrismaDataForJson(store);
		if (facilities.length > 0) {
			transformPrismaDataForJson(facilities);
		}
		if (rsvpSettings) {
			transformPrismaDataForJson(rsvpSettings);
		}
		if (storeSettings) {
			transformPrismaDataForJson(storeSettings);
		}

		// Transform RSVPs once (no need for double transformation)
		formattedRsvps = existingReservations.map((rsvp) => {
			const transformed = { ...rsvp };
			transformPrismaDataForJson(transformed);
			return transformed as Rsvp;
		});
	} catch (error) {
		logger.error("Failed to load reservation page", {
			metadata: {
				storeId: params.storeId,
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
				<div className="mx-auto max-w-7xl py-6">
					<ReservationClient
						existingReservations={formattedRsvps}
						rsvpSettings={rsvpSettings}
						storeSettings={storeSettings}
						facilities={facilities}
						user={user}
						storeId={params.storeId}
						storeOwnerId={store.ownerId}
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
				</div>
			</Suspense>
		</Container>
	);
}


*/
