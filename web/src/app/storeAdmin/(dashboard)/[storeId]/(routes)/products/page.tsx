import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { mapProductToColumn } from "@/lib/store-admin/map-product-column";
import { transformPrismaDataForJson } from "@/utils/utils";
import { ClientProduct } from "./components/client-product";

type Params = Promise<{ storeId: string }>;

export default async function StoreProductsPage(props: { params: Params }) {
	const params = await props.params;

	const [rows, categories] = await Promise.all([
		sqlClient.product.findMany({
			where: { storeId: params.storeId },
			include: {
				ProductAttribute: true,
				ProductCategories: { select: { categoryId: true } },
				ProductOptions: {
					include: { ProductOptionSelections: { orderBy: { name: "asc" } } },
					orderBy: { sortOrder: "asc" },
				},
			},
			orderBy: { updatedAt: "desc" },
		}),
		sqlClient.category.findMany({
			where: { storeId: params.storeId },
			select: { id: true, name: true },
			orderBy: { sortOrder: "asc" },
		}),
	]);

	transformPrismaDataForJson(rows);

	const columns = rows.map((p) => mapProductToColumn(p));

	return (
		<Container>
			<ClientProduct
				serverData={columns}
				storeId={params.storeId}
				categories={categories}
			/>
		</Container>
	);
}
