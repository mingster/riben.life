import Container from "@/components/ui/container";
import { ServiceStaffClient } from "./components/client-service-staff";
import { getServiceStaffAction } from "@/actions/storeAdmin/serviceStaff/get-service-staff";
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

	return (
		<Container>
			<ServiceStaffClient serverData={formattedData} />
		</Container>
	);
}
