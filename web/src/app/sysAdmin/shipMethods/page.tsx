import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { formatDateTime, epochToDate } from "@/utils/datetime-utils";
import { checkAdminAccess } from "../admin-utils";
import type { DataColumn } from "./components/columns";
import { DataClient } from "./components/data-client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ShipMethodAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const _params = await props.params;
	checkAdminAccess();

	// Optimized query using _count instead of loading all related data
	const methods = await sqlClient.shippingMethod.findMany({
		include: {
			_count: {
				select: {
					stores: true,
					StoreOrder: true,
					Shipment: true,
				},
			},
		},
		orderBy: {
			name: "asc",
		},
	});

	transformPrismaDataForJson(methods);

	// Map methods to UI format
	const formattedData: DataColumn[] = methods.map((item) => ({
		id: item.id,
		name: item.name || "",
		currencyId: item.currencyId || "",
		basic_price: Number(item.basic_price) || 0,
		isDefault: item.isDefault,
		isDeleted: item.isDeleted,
		shipRequired: item.shipRequired,
		updatedAt: formatDateTime(
			epochToDate(BigInt(item.updatedAt)) ?? new Date(),
		),
		stores: item._count.stores,
		StoreOrder: item._count.StoreOrder,
		Shipment: item._count.Shipment,
	}));

	return (
		<Container>
			<DataClient data={formattedData} />
		</Container>
	);
}
