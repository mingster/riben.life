import getStoreWithProducts from "@/actions/get-store-with-products";
import { sqlClient } from "@/lib/prismadb";
import type { Product, StoreWithProducts } from "@/types";
import { transformDecimalsToNumbers } from "@/utils/utils";
import { redirect } from "next/navigation";
import { Client } from "./client";

type Params = Promise<{ storeId: string; productId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreProductPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	const store = (await getStoreWithProducts(
		params.storeId,
	)) as StoreWithProducts;

	if (!store) {
		redirect("/unv");
	}

	transformDecimalsToNumbers(store);

	const product = (await sqlClient.product.findUnique({
		where: {
			id: params.productId,
		},
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
	})) as Product;
	transformDecimalsToNumbers(product);

	//console.log(`StoreProductPage: ${JSON.stringify(product)}`);

	return (
		<div className="flex-col">
			<div className="flex-1 space-y-4 p-8 pt-6">
				<Client product={product} store={store} />
			</div>
		</div>
	);
}
