import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import { sqlClient } from "@/lib/prismadb";
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";
import type { StoreProductOptionTemplate } from "@/types";
import type { Store } from "@prisma/client";
import { Suspense } from "react";

import { transformDecimalsToNumbers } from "@/utils/utils";
import { ProductsOptionTemplateClient } from "./product-option-template-client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ProductOptionTemplatePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	const _store = (await checkStoreStaffAccess(params.storeId)) as Store;

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
	transformDecimalsToNumbers(storeOptionTemplates);

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<ProductsOptionTemplateClient data={storeOptionTemplates} />
			</Container>
		</Suspense>
	);
}
