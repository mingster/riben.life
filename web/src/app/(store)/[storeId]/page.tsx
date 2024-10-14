import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import BusinessHours from "@/lib/businessHours";
import { mongoClient, sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import type { StoreSettings } from "@prisma-mongo/prisma/client";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StoreHomeContent } from "./components/store-home-content";

import { useTranslation } from "@/app/i18n";
import { useI18n } from "@/providers/i18n-provider";
import { formatDate } from "date-fns";
import getStoreWithProducts from "@/actions/get-store-with-products";

const storeObj = Prisma.validator<Prisma.StoreDefaultArgs>()({
  include: {
    Categories: { include: { ProductCategories: true } },
  },
});
export type StoreWithProductNCategories = Prisma.StoreGetPayload<
  typeof storeObj
>;

//import { Metadata } from 'next';
interface pageProps {
  params: {
    storeId: string;
  };
}
const StoreHomePage: React.FC<pageProps> = async ({ params }) => {
  const store = await getStoreWithProducts(params.storeId);
  
  //console.log(JSON.stringify(store));

  if (!store) {
    redirect("/unv");
  }

  transformDecimalsToNumbers(store);

  const storeSettings = (await mongoClient.storeSettings.findFirst({
    where: {
      databaseId: params.storeId,
    },
  })) as StoreSettings;
  //console.log(JSON.stringify(storeSettings));

  const { t } = await useTranslation(store?.defaultLocale || "en");

  let closed_descr = "";
  let isStoreOpen = store.isOpen;
  if (store.useBusinessHours && storeSettings.businessHours !== null) {
    const bizHour = storeSettings.businessHours;
    const businessHours = new BusinessHours(bizHour);

    isStoreOpen = businessHours.isOpenNow();

    const nextOpeningDate = businessHours.nextOpeningDate();
    const nextOpeningHour = businessHours.nextOpeningHour();

    closed_descr = `${formatDate(nextOpeningDate, "yyyy-MM-dd")} ${nextOpeningHour}`;
  }

  //console.log(`closed_descr: ${closed_descr}`);
  //console.log(`isStoreOpen: ${isStoreOpen}`);

  return (
    <Suspense fallback={<Loader />}>
      <Container>
        {!isStoreOpen ? (
          <>
            <h1>{t("store_closed")}</h1>
            <div>
              {t("store_next_opening_hours")}
              {closed_descr}
            </div>
          </>
        ) : (
          <>
            <StoreHomeContent storeData={store} mongoData={storeSettings} />
          </>
        )}
      </Container>
    </Suspense>
  );
};
export default StoreHomePage;
