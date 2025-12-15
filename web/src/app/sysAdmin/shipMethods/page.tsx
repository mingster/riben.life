import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { checkAdminAccess } from "../admin-utils";
import { ShippingMethodClient } from "./components/client-shipping-method";
import {
	mapShippingMethodToColumn,
	type ShippingMethodColumn,
} from "./shipping-method-column";

type Params = Promise<{ [key: string]: string | string[] | undefined }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ShippingMethodAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	await props.params;
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
	const formattedData: ShippingMethodColumn[] = methods.map((item) =>
		mapShippingMethodToColumn(item),
	);

	return (
		<Container>
			<ShippingMethodClient serverData={formattedData} />
		</Container>
	);
}
