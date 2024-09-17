import { authOptions } from "@/auth";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import { format } from "date-fns";
import { Suspense } from "react";
import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";
import type { Store } from "@prisma/client";
import type { FaqCategory } from "@/types";
import type { FaqCategoryColumn } from "./components/columns";
import { FaqCategoryClient } from "./components/faqCategory-client";

//import { Metadata } from 'next';
interface pageProps {
  params: {
    storeId: string;
  };
}

// here we save store settings to mangodb
//
const FaqCategoryPage: React.FC<pageProps> = async ({ params }) => {
  const store = (await checkStoreAccess(params.storeId)) as Store;

  const categories = await sqlClient.faqCategory.findMany({
    where: {
      storeId: store.id,
    },
    include: {
      FAQ: true,
    },
    orderBy: {
      sortOrder: "asc",
    },
  });

  // map FAQ Category to ui
  const formattedCategories: FaqCategoryColumn[] = categories.map(
    (item: FaqCategory) => ({
      faqCategoryId: item.id.toString(),
      storeId: store.id.toString(),
      name: item.name.toString(),
      sortOrder: Number(item.sortOrder) || 0,
      faqCount: Number(item.FAQ.length) || 0,
    }),
  );

  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <FaqCategoryClient data={formattedCategories} />
      </Container>
    </Suspense>
  );
};

export default FaqCategoryPage;
