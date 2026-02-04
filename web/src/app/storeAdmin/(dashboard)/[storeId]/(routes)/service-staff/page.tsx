import { getServiceStaffAction } from "@/actions/storeAdmin/serviceStaff/get-service-staff";
import { Loader } from "@/components/loader";
import { sqlClient } from "@/lib/prismadb";
import { Suspense } from "react";
import { ServiceStaffClient } from "./components/client-service-staff";
import {
	mapServiceStaffToColumn,
	type ServiceStaffColumn,
} from "./service-staff-column";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ServiceStaffAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	const result = await getServiceStaffAction(params.storeId, {});

	if (result?.serverError) {
		throw new Error(result.serverError);
	}

	const serviceStaff = result?.data?.serviceStaff ?? [];

	// Map service staff to column format, ensuring Decimal objects are converted to numbers
	const formattedData: ServiceStaffColumn[] = serviceStaff.map(
		mapServiceStaffToColumn,
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
