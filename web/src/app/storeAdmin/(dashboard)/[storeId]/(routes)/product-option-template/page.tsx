import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import type { Product, StoreProductOptionTemplate } from "@/types";
import type { Store } from "@prisma/client";
import { format } from "date-fns";
import { Suspense } from "react";

import { transformDecimalsToNumbers } from "@/lib/utils";
import { ProductsOptionTemplateClient } from "./product-option-template-client";

//import { Metadata } from 'next';
interface pageProps {
  params: {
    storeId: string;
  };
}

// here we save store settings to mangodb
//
const ProductOptionTemplatePage: React.FC<pageProps> = async ({ params }) => {
  const store = (await checkStoreAccess(params.storeId)) as Store;

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
};

export default ProductOptionTemplatePage;
