import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";
import type { StoreProductOptionTemplate } from "@/types";
import type { Store } from "@prisma/client";
import { transformDecimalsToNumbers } from "@/utils/utils";
import { ProductsOptionTemplateClient } from "./product-option-template-client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ProductOptionTemplatePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Parallel queries for optimal performance
	const [_store, storeOptionTemplates] = await Promise.all([
		checkStoreStaffAccess(params.storeId),
		sqlClient.storeProductOptionTemplate.findMany({
			where: { storeId: params.storeId },
			include: {
				StoreProductOptionSelectionsTemplate: true,
			},
			orderBy: { sortOrder: "asc" },
		}),
	]);

	transformDecimalsToNumbers(storeOptionTemplates);

	return (
		<Container>
			<ProductsOptionTemplateClient
				data={storeOptionTemplates as StoreProductOptionTemplate[]}
			/>
		</Container>
	);
}
