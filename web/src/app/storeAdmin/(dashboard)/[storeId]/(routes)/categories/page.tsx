import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import type { Category } from "@/types";
import { CategoryClient } from "./components/category-client";
import type { CategoryColumn } from "./components/columns";

type Params = Promise<{ storeId: string; messageId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function CategoryPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)

	/*
	const _lastSort = await sqlClient.category.findFirst({
		where: { storeId: params.storeId },
		orderBy: { sortOrder: "desc" },
	});
	//console.log(JSON.stringify(lastSort?.sortOrder));
	*/

	//const store = await getStoreWithRelations(params.storeId);

	const categories = await sqlClient.category.findMany({
		where: {
			storeId: params.storeId,
		},
		include: {
			ProductCategories: true,
		},
		orderBy: {
			sortOrder: "asc",
		},
	});

	// Map categories to UI columns
	const formattedCategories: CategoryColumn[] = categories.map(
		(item: Category) => ({
			categoryId: item.id,
			storeId: params.storeId,
			name: item.name,
			isFeatured: item.isFeatured,
			sortOrder: Number(item.sortOrder) || 0,
			numOfProducts: item.ProductCategories.length,
		}),
	);

	return (
		<Container>
			<CategoryClient data={formattedCategories} />
		</Container>
	);
}
