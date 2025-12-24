import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { auth } from "@/lib/auth";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import type {
	Rsvp,
	RsvpSettings,
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
import { ReservationClient } from "./components/client-reservation";

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

	// Get RSVPs for a wider range (current week ± 2 weeks) to support navigation
	// Use UTC to ensure server-independent time calculations
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
	let store;
	let rsvpSettings: RsvpSettings | null;
	let facilities: StoreFacility[];
	let rsvps: Rsvp[];
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
					Facility: true,
				},
				orderBy: { rsvpTime: "asc" },
			}),
			sqlClient.storeSettings.findFirst({
				where: { storeId: actualStoreId },
			}),
		]);

		rsvpSettings = rsvpSettingsResult;
		facilities = facilitiesResult;
		rsvps = rsvpsResult;
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
		// They will be prompted to sign in and recharge after creating the reservation

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
		formattedRsvps = rsvps.map((rsvp) => {
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
						rsvps={formattedRsvps}
						rsvpSettings={rsvpSettings}
						storeSettings={storeSettings}
						facilities={facilities}
						user={user}
						storeId={params.storeId}
						storeOwnerId={store.ownerId}
						storeTimezone={store.defaultTimezone || "Asia/Taipei"}
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
