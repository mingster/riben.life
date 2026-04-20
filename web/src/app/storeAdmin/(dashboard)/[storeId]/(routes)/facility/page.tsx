import { notFound } from "next/navigation";

import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";
import { transformPrismaDataForJson } from "@/utils/utils";

import { ClientFacility } from "./components/client-facility";
import { mapFacilityToColumn } from "./table-column";

type Params = Promise<{ storeId: string }>;

export default async function StoreAdminFacilityPage(props: {
	params: Params;
}) {
	const params = await props.params;
	const access = await checkStoreStaffAccess(params.storeId);
	if (!access) {
		notFound();
	}

	const [store, facilities] = await Promise.all([
		sqlClient.store.findUnique({
			where: { id: params.storeId },
			select: { defaultTimezone: true },
		}),
		sqlClient.storeFacility.findMany({
			where: { storeId: params.storeId },
			orderBy: { facilityName: "asc" },
		}),
	]);

	transformPrismaDataForJson(facilities);

	const rows = facilities.map((f) => mapFacilityToColumn(f));
	const defaultTimezone = store?.defaultTimezone ?? "Asia/Taipei";

	return (
		<Container>
			<ClientFacility defaultTimezone={defaultTimezone} serverData={rows} />
		</Container>
	);
}
