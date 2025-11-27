import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/utils/utils";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loader } from "@/components/loader";
import { ReservationClient } from "./components/reservation-client";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { StoreFacility, User, Rsvp } from "@/types";
import type { RsvpSettings, StoreSettings } from "@prisma/client";
import logger from "@/lib/logger";
import { startOfWeek, endOfWeek } from "date-fns";

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
	const now = new Date();
	const weekStart = startOfWeek(now, { weekStartsOn: 0 }); // Sunday
	const weekEnd = endOfWeek(now, { weekStartsOn: 0 }); // Saturday

	// Extend range by 2 weeks before and after
	const rangeStart = new Date(weekStart);
	rangeStart.setDate(rangeStart.getDate() - 14);
	const rangeEnd = new Date(weekEnd);
	rangeEnd.setDate(rangeEnd.getDate() + 14);

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
							gte: rangeStart,
							lte: rangeEnd,
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

		// Transform decimals
		transformDecimalsToNumbers(store);
		if (facilities) {
			transformDecimalsToNumbers(facilities);
		}

		if (rsvpSettings) {
			transformDecimalsToNumbers(rsvpSettings);
		}
		transformDecimalsToNumbers(facilities);
		if (storeSettings) {
			transformDecimalsToNumbers(storeSettings);
		}
		if (rsvps) {
			transformDecimalsToNumbers(rsvps);
		}

		// Transform Decimal objects to numbers for client components
		formattedRsvps = (rsvps as Rsvp[]).map((rsvp) => {
			const transformed = { ...rsvp };
			transformDecimalsToNumbers(transformed);
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
					/>
				</div>
			</Suspense>
		</Container>
	);
}
