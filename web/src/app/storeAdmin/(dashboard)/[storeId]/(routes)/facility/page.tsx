import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import type { StoreFacility } from "@prisma/client";
import { FacilityClient } from "./components/client-facility";
import { mapFacilityToColumn, type TableColumn } from "./table-column";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function FacilityPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	const facilities = await sqlClient.storeFacility.findMany({
		where: { storeId: params.storeId },
		orderBy: { facilityName: "asc" },
	});

	// Map facilities to UI columns
	const formattedData: TableColumn[] = (facilities as StoreFacility[]).map(
		mapFacilityToColumn,
	);

	return (
		<Container>
			<FacilityClient serverData={formattedData} />
		</Container>
	);
}
