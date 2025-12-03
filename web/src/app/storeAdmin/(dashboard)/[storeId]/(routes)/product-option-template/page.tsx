import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { ProductOptionTemplateClient } from "./components/client-product-option-template";
import {
	mapProductOptionTemplateToColumn,
	type ProductOptionTemplateColumn,
} from "./product-option-template-column";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ProductOptionTemplatePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	const storeOptionTemplates =
		await sqlClient.storeProductOptionTemplate.findMany({
			where: { storeId: params.storeId },
			include: {
				StoreProductOptionSelectionsTemplate: true,
			},
			orderBy: { sortOrder: "asc" },
		});

	transformPrismaDataForJson(storeOptionTemplates);

	const formattedTemplates: ProductOptionTemplateColumn[] =
		storeOptionTemplates.map(mapProductOptionTemplateToColumn);

	return (
		<Container>
			<ProductOptionTemplateClient serverData={formattedTemplates} />
		</Container>
	);
}
