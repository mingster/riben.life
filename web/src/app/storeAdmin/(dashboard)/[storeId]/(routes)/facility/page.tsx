import Container from "@/components/ui/container";
import { FacilityClient } from "./components/client-facility";
import { getFacilitiesAction } from "@/actions/storeAdmin/facility/get-facilities";
import { mapFacilityToColumn, type TableColumn } from "./table-column";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function FacilityAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	const result = await getFacilitiesAction(params.storeId, {});

	if (result?.serverError) {
		throw new Error(result.serverError);
	}

	const facilities = result?.data?.facilities ?? [];

	// Map facilities to column format, ensuring Decimal objects are converted to numbers
	const formattedData: TableColumn[] = facilities.map(mapFacilityToColumn);

	return (
		<Container>
			<FacilityClient serverData={formattedData} />
		</Container>
	);
}
