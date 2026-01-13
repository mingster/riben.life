import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loader } from "@/components/loader";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { Rsvp } from "@/types";
import logger from "@/lib/logger";
import { isValidGuid } from "@/utils/guid-utils";
import { CustomerReservationHistoryClient } from "./components/customer-reservation-history-client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ReservationHistoryPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Get session to check if user is logged in (optional for anonymous users)
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const sessionUserId = session?.user?.id;

	// Find store by ID (UUID) or name
	const isUuid = isValidGuid(params.storeId);
	const store = await sqlClient.store.findFirst({
		where: isUuid
			? { id: params.storeId }
			: { name: { equals: params.storeId, mode: "insensitive" } },
		select: {
			id: true,
			name: true,
			defaultTimezone: true,
			defaultCurrency: true,
			useCustomerCredit: true,
			creditExchangeRate: true,
			creditServiceExchangeRate: true,
		},
	});

	if (!store) {
		logger.error("Store not found", {
			metadata: { storeId: params.storeId },
			tags: ["reservation", "error"],
		});
		redirect("/unv");
	}

	// Use the actual store ID for subsequent queries
	const actualStoreId = store.id;

	// Fetch reservations for the current user in this store
	// If user is logged in, fetch their reservations
	// If anonymous, fetch all anonymous reservations (client will filter by local storage)
	const [rsvps, rsvpSettings, facilities, storeSettings] = await Promise.all([
		sqlClient.rsvp.findMany({
			where: sessionUserId
				? {
						storeId: actualStoreId,
						customerId: sessionUserId,
					}
				: {
						storeId: actualStoreId,
						customerId: null, // Anonymous reservations
					},
			include: {
				Store: true,
				Customer: true,
				Order: true,
				Facility: true,
				FacilityPricingRule: true,
			},
			orderBy: { rsvpTime: "desc" },
		}),
		sqlClient.rsvpSettings.findFirst({
			where: { storeId: actualStoreId },
		}),
		sqlClient.storeFacility.findMany({
			where: { storeId: actualStoreId },
			orderBy: { facilityName: "asc" },
		}),
		sqlClient.storeSettings.findFirst({
			where: { storeId: actualStoreId },
		}),
	]);

	// Transform Decimal objects to numbers for client components
	const formattedData: Rsvp[] = (rsvps as Rsvp[]).map((rsvp) => {
		const transformed = { ...rsvp };
		transformPrismaDataForJson(transformed);
		return transformed as Rsvp;
	});

	if (rsvpSettings) {
		transformPrismaDataForJson(rsvpSettings);
	}
	if (facilities.length > 0) {
		transformPrismaDataForJson(facilities);
	}
	if (storeSettings) {
		transformPrismaDataForJson(storeSettings);
	}

	return (
		<Container>
			<Suspense fallback={<Loader />}>
				<CustomerReservationHistoryClient
					serverData={formattedData}
					storeTimezone={store.defaultTimezone || "Asia/Taipei"}
					rsvpSettings={rsvpSettings}
					storeId={actualStoreId}
					user={session?.user || null}
					storeCurrency={store.defaultCurrency || "twd"}
					useCustomerCredit={store.useCustomerCredit || false}
					creditExchangeRate={
						store.creditExchangeRate ? Number(store.creditExchangeRate) : null
					}
					creditServiceExchangeRate={
						store.creditServiceExchangeRate
							? Number(store.creditServiceExchangeRate)
							: null
					}
					facilities={facilities}
					storeSettings={storeSettings}
				/>
			</Suspense>
		</Container>
	);
}
