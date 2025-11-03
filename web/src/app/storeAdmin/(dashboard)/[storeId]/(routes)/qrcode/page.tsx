import Container from "@/components/ui/container";
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";
import { sqlClient } from "@/lib/prismadb";
import type { Store } from "@/types";
import { transformDecimalsToNumbers } from "@/utils/utils";
import type { StoreTables } from "@prisma/client";
import { QrCodeClient } from "./client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function QrCodePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Parallel queries for optimal performance
	const [store, tables] = await Promise.all([
		checkStoreStaffAccess(params.storeId),
		sqlClient.storeTables.findMany({
			where: { storeId: params.storeId },
			orderBy: { tableName: "asc" },
		}),
	]);

	transformDecimalsToNumbers(store);

	return (
		<Container>
			<div className="mb-4 text-xl font-semibold">QR Code</div>
			<QrCodeClient store={store} tables={tables as StoreTables[]} />
		</Container>
	);
}
