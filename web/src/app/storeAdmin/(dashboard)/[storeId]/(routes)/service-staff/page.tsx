import { Loader } from "@/components/loader";
import { getServiceStaffData } from "@/actions/store/reservation/get-service-staff-data";
import { sqlClient } from "@/lib/prismadb";
import { Suspense } from "react";
import { ServiceStaffClient } from "./components/client-service-staff";
import type { ServiceStaffColumn } from "./service-staff-column";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ServiceStaffAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Use lib fetch here — not storeActionClient from RSC (session cookies are not applied to server-action calls from Server Components, which yields Unauthorized).
	const formattedData: ServiceStaffColumn[] = await getServiceStaffData(
		params.storeId,
		{},
	);

	// Fetch store to get currency information
	const store = await sqlClient.store.findUnique({
		where: { id: params.storeId },
		select: { defaultCurrency: true },
	});

	// Fetch currency information including decimals (Currency.id is uppercase, e.g. TWD, USD)
	const currency = store?.defaultCurrency
		? await sqlClient.currency.findUnique({
				where: { id: store.defaultCurrency.toUpperCase() },
				select: { decimals: true },
			})
		: null;
	const currencyDecimals = currency?.decimals ?? 0; // Default to 0 if not found

	// Fetch facilities for schedule management
	const facilities = await sqlClient.storeFacility.findMany({
		where: { storeId: params.storeId },
		select: { id: true, facilityName: true },
		orderBy: { facilityName: "asc" },
	});

	//console.log("serviceStaff", serviceStaff);
	return (
		<Suspense fallback={<Loader />}>
			<ServiceStaffClient
				serverData={formattedData}
				currencyDecimals={currencyDecimals}
				facilities={facilities}
			/>
		</Suspense>
	);
}
