import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import type { Product } from "@/types";
import { transformDecimalsToNumbers } from "@/utils/utils";
import { formatDateTime } from "@/utils/datetime-utils";
import type { ProductColumn } from "./components/columns";
import { ProductsClient } from "./components/products-client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ProductsPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	const products = await sqlClient.product.findMany({
		where: { storeId: params.storeId },
		include: {
			ProductImages: true,
			ProductAttribute: true,
			ProductCategories: true,
			ProductOptions: {
				include: {
					ProductOptionSelections: true,
				},
				orderBy: {
					sortOrder: "asc",
				},
			},
		},
	});

	transformDecimalsToNumbers(products);

	// Map products to UI columns
	const formattedProducts: ProductColumn[] = (products as Product[]).map(
		(item) => ({
			id: item.id,
			name: item.name,
			status: item.status,
			price: Number(item.price),
			isFeatured: item.isFeatured,
			updatedAt: formatDateTime(item.updatedAt),
			stock: item.ProductAttribute?.stock || 0,
			isRecurring: item.ProductAttribute?.isRecurring,
			hasOptions: item.ProductOptions?.length > 0,
		}),
	);

	return (
		<Container>
			<ProductsClient serverData={formattedProducts} />
		</Container>
	);
}
