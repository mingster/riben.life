import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loader } from "@/components/loader";
import { ReservationClient } from "./components/client-reservation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { StoreFacility, User, Rsvp } from "@/types";
import type { RsvpSettings, StoreSettings } from "@prisma/client";
import logger from "@/lib/logger";
import { getUtcNow, dateToEpoch } from "@/utils/datetime-utils";

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

	// Get start of week (Sunday) using UTC
	const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
	const daysToSunday = dayOfWeek === 0 ? 0 : dayOfWeek; // Days to subtract to get to Sunday
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

	// Get end of week (Saturday) using UTC - 6 days after Sunday at 23:59:59.999
	const weekEnd = new Date(
		Date.UTC(
			weekStart.getUTCFullYear(),
			weekStart.getUTCMonth(),
			weekStart.getUTCDate() + 6, // Saturday is 6 days after Sunday
			23,
			59,
			59,
			999,
		),
	);

	// Extend range by 2 weeks before and after using UTC
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

	// Fetch store, RSVP settings, facilities, reservations, store settings, and user in parallel
	let store;
	let rsvpSettings: RsvpSettings | null;
	let facilities: StoreFacility[];
	let rsvps: Rsvp[];
	let storeSettings: StoreSettings | null;
	let user: User | null = null;
	let formattedRsvps: Rsvp[] = [];

	try {
		[store, rsvpSettings, facilities, rsvps, storeSettings] = await Promise.all(
			[
				sqlClient.store.findFirst({
					where: { id: params.storeId },
					select: {
						id: true,
						name: true,
						defaultTimezone: true,
					},
				}),
				sqlClient.rsvpSettings.findFirst({
					where: { storeId: params.storeId },
				}),
				sqlClient.storeFacility.findMany({
					where: { storeId: params.storeId },
					orderBy: { facilityName: "asc" },
				}),
				sqlClient.rsvp.findMany({
					where: {
						storeId: params.storeId,
						rsvpTime: {
							gte: dateToEpoch(rangeStart) ?? BigInt(0),
							lte: dateToEpoch(rangeEnd) ?? BigInt(0),
						},
					},
					include: {
						Store: true,
						User: true,
						Facility: true,
					},
					orderBy: { rsvpTime: "asc" },
				}),
				sqlClient.storeSettings.findFirst({
					where: { storeId: params.storeId },
				}),
			],
		);

		// Get user if logged in
		if (session?.user?.id) {
			user = (await sqlClient.user.findUnique({
				where: { id: session.user.id },
			})) as User | null;
		}

		if (!store) {
			logger.error("Store not found", {
				metadata: { storeId: params.storeId },
				tags: ["reservation", "error"],
			});
			redirect("/unv");
		}

		// Check if reservations are accepted
		if (!rsvpSettings || !rsvpSettings.acceptReservation) {
			logger.warn("Reservations not accepted for store", {
				metadata: { storeId: params.storeId },
				tags: ["reservation", "warning"],
			});
			// Still show the page but the form will handle the error
		}

		// If prepaid is required and user is not logged in, redirect to sign in
		if (rsvpSettings?.prepaidRequired && !user) {
			redirect(`/signIn/?callbackUrl=/${params.storeId}/reservation`);
		}

		// Transform BigInt (epoch timestamps) and Decimal to numbers for JSON serialization
		transformPrismaDataForJson(store);
		if (facilities) {
			transformPrismaDataForJson(facilities);
		}

		if (rsvpSettings) {
			transformPrismaDataForJson(rsvpSettings);
		}
		if (storeSettings) {
			transformPrismaDataForJson(storeSettings);
		}
		if (rsvps) {
			transformPrismaDataForJson(rsvps);
		}

		// Transform BigInt (epoch timestamps) and Decimal to numbers for client components
		formattedRsvps = (rsvps as Rsvp[]).map((rsvp) => {
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
						storeTimezone={store?.defaultTimezone ?? "Asia/Taipei"}
					/>
				</div>
			</Suspense>
		</Container>
	);
}
