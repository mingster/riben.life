import { sqlClient } from "@/lib/prismadb";
import type { Product, StoreProductOptionTemplate } from "@/types";
import { transformPrismaDataForJson } from "@/utils/utils";
import { ProductEditTabs } from "./tabs";
import { Suspense } from "react";
import { Loader } from "@/components/loader";

const ProductEditPage = async (props: {
	params: Promise<{ productId: string; storeId: string }>;
}) => {
	const params = await props.params;
	const product = (await sqlClient.product.findUnique({
		where: {
			id: params.productId,
		},
		include: {
			ProductImages: true,
			ProductAttribute: true,
			ProductCategories: true,
			ProductOptions: {
				include: {
					ProductOptionSelections: true,
				},
			},
		},
	})) as Product | null;

	const allCategories = await sqlClient.category.findMany({
		where: {
			storeId: params.storeId,
		},
		orderBy: {
			sortOrder: "asc",
		},
	});

	transformPrismaDataForJson(product);
	//console.log(`ProductPa//ge: ${JSON.stringify(product)}`);

	const storeOptionTemplates =
		(await sqlClient.storeProductOptionTemplate.findMany({
			where: {
				storeId: params.storeId,
			},
			include: {
				StoreProductOptionSelectionsTemplate: true,
			},
			orderBy: {
				sortOrder: "asc",
			},
		})) as StoreProductOptionTemplate[];
	transformPrismaDataForJson(storeOptionTemplates);

	let action = "Edit";
	if (product === null) action = "Create";

	return (
		<div className="flex-col">
			<div className="flex-1 space-y-4 p-8 pt-6">
				<Suspense fallback={<Loader />}>
					<ProductEditTabs
						initialData={product}
						allCategories={allCategories}
						storeOptionTemplates={storeOptionTemplates}
						action={action}
					/>
				</Suspense>
			</div>
		</div>
	);
};

export default ProductEditPage;
