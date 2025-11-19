import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import type { StoreFacility } from "@prisma/client";
import { QrCodeClient } from "./client";
import { getStoreWithRelations } from "@/lib/store-access";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function QrCodePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	// Parallel queries for optimal performance
	const [store, tables] = await Promise.all([
		getStoreWithRelations(params.storeId),
		sqlClient.storeFacility.findMany({
			where: { storeId: params.storeId },
			orderBy: { facilityName: "asc" },
		}),
	]);

	return (
		<Container>
			<div className="mb-4 text-xl font-semibold">QR Code</div>
			<QrCodeClient store={store} tables={tables as StoreFacility[]} />
		</Container>
	);
}
