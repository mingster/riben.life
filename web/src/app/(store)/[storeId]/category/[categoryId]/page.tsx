import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import { sqlClient } from "@/lib/prismadb";
import { Prisma } from "@prisma/client";
import { Suspense } from "react";
import type { Store } from "@/types";
import { transformDecimalsToNumbers } from "@/utils/utils";
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

	const storeData = (await sqlClient.store.findUnique({
		where: {
			id: params.storeId,
		},
	})) as Store;

	/*
  const { t } = await useTranslation(storeData?.defaultLocale || "en");
        {!storeData.isOpen && <h2 className="pb-5">{t("store_closed")}</h2>}

  */

	if (!storeData) return;

	if (params.categoryId === null) return;

	const category = await sqlClient.category.findUnique({
		where: {
			id: params.categoryId,
		},
		include: {
			ProductCategories: {
				include: {
					Product: {
						include: {
							ProductImages: true,
							ProductAttribute: true,
							//ProductCategories: true,
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
	});

	if (category === null) return;

	transformDecimalsToNumbers(category);
	//console.log(JSON.stringify(category));

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				{!storeData.isOpen && <h2 className="pb-5">目前店休，無法接受訂單</h2>}

				<div className="grid grid-flow-row-dense lg:grid-flow-col gap-3">
					<Client category={category} store={storeData} />
				</div>
			</Container>
		</Suspense>
	);
}
