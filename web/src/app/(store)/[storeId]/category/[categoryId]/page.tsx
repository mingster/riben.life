import { ProductCard } from "@/app/(store)/[storeId]/components/product-card";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import { Prisma } from "@prisma/client";
import { Suspense } from "react";
//import { Metadata } from 'next';

import { useTranslation } from "@/app/i18n";
import { transformDecimalsToNumbers } from "@/lib/utils";
import type { Store } from "@/types";
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

interface pageProps {
  params: {
    storeId: string;
    categoryId: string;
  };
}
// display products in the given category
const CategoryPage: React.FC<pageProps> = async ({ params }) => {
  if (params.storeId === null) return;
  if (params.categoryId === null) return;

  const storeData = await sqlClient.store.findUnique({
    where: {
      id: params.storeId,
    },
  }) as Store;

  const { t } = await useTranslation(storeData?.defaultLocale || "en");

  if (!storeData) return;

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
        {!storeData.isOpen && <h2 className="pb-5">{t("store_closed")}</h2>}

        <div className="grid grid-flow-row-dense lg:grid-flow-col gap-3">
          <Client category={category} store={storeData} />
        </div>
      </Container>
    </Suspense>
  );
};
export default CategoryPage;
