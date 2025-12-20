import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { Prisma } from "@prisma/client";
import type { Store } from "@/types";
import { transformPrismaDataForJson } from "@/utils/utils";
import { Client } from "./client";

const prodCategoryObj = Prisma.validator<Prisma.ProductCategoriesDefaultArgs>()(
	{
		include: {
			Product: {
				include: {
					ProductImages: true,
					ProductAttribute: true,
					ProductOptions: {
						include: {
							ProductOptionSelections: true,
						},
					},
					ProductCategories: true,
				},
			},
		},
	},
);
export type ProductCategories = Prisma.ProductCategoriesGetPayload<
	typeof prodCategoryObj
>;

type Params = Promise<{ storeId: string; categoryId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function CategoryPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	if (params.categoryId === null) return null;

	// Parallel queries for optimal performance
	const [storeData, category] = await Promise.all([
		sqlClient.store.findUnique({
			where: { id: params.storeId },
			select: {
				id: true,
				name: true,
				isOpen: true,
				defaultLocale: true,
			},
		}),
		sqlClient.category.findUnique({
			where: { id: params.categoryId },
			include: {
				ProductCategories: {
					include: {
						Product: {
							include: {
								ProductImages: true,
								ProductAttribute: true,
								ProductOptions: {
									include: {
										ProductOptionSelections: true,
									},
								},
							},
						},
					},
					orderBy: {
						sortOrder: "asc",
					},
				},
			},
		}),
	]);

	if (!storeData || !category) return null;

	transformPrismaDataForJson(category);

	return (
		<Container>
			{!storeData.isOpen && <h2 className="pb-5">目前店休，無法接受訂單</h2>}

			<div className="grid grid-flow-row-dense lg:grid-flow-col gap-3">
				<Client category={category} store={storeData as Store} />
			</div>
		</Container>
	);
}
