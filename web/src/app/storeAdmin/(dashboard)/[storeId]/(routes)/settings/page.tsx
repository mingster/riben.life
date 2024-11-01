import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { mongoClient } from "@/lib/prismadb";
import {
  Prisma,
  type PaymentMethod,
  type ShippingMethod,
} from "@prisma/client";
import { Suspense } from "react";
import { StoreSettingTabs } from "./tabs";
import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import isProLevel from "@/actions/storeAdmin/is-pro-level";

const storeObj = Prisma.validator<Prisma.StoreDefaultArgs>()({
  include: {
    StoreShippingMethods: true,
    StorePaymentMethods: true,
  },
});
export type Store = Prisma.StoreGetPayload<typeof storeObj>;

//import { Metadata } from 'next';
interface pageProps {
  params: {
    storeId: string;
  };
}

// here we save store settings to mangodb
//
const StoreSettingsPage: React.FC<pageProps> = async ({ params }) => {
  //NOTE - we call checkStoreAccess here to get the store object
  const store = (await checkStoreAccess(params.storeId)) as Store;

  transformDecimalsToNumbers(store);

  //console.log(`store: ${JSON.stringify(store)}`);
  const storeSettings = await mongoClient.storeSettings.findFirst({
    where: {
      databaseId: params.storeId,
    },
  });

  //console.log(`store: ${JSON.stringify(store)}`);
  //console.log('storeSettings: ' + JSON.stringify(storeSettings));

  /*
  await sqlClient.storePaymentMethodMapping.deleteMany({
    where: {
      storeId: params.storeId,
    }
  })
  await sqlClient.storeShipMethodMapping.deleteMany({
    where: {
      storeId: params.storeId,
    }
  })
  */

  const allPaymentMethods = (await sqlClient.paymentMethod.findMany({
    where: { isDeleted: false },
  })) as PaymentMethod[];
  const allShippingMethods = (await sqlClient.shippingMethod.findMany({
    where: { isDeleted: false },
  })) as ShippingMethod[];

  transformDecimalsToNumbers(allPaymentMethods);
  transformDecimalsToNumbers(allShippingMethods);

  // this store is pro version or not?
  const disablePaidOptions = await !isProLevel(store?.id);

  console.log("disablePaidOptions", disablePaidOptions);
  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <StoreSettingTabs
          sqlData={store}
          mongoData={storeSettings}
          paymentMethods={allPaymentMethods}
          shippingMethods={allShippingMethods}
          disablePaidOptions={disablePaidOptions}
        />
      </Container>
    </Suspense>
  );
};

export default StoreSettingsPage;
