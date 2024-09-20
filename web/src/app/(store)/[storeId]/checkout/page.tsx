import getUser from "@/actions/get-user";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Checkout } from "./component/checkOut";
import type {
  Store,
  StorePaymentMethodMapping,
  StoreShipMethodMapping,
} from "@/types";
import type { PaymentMethod, ShippingMethod } from "@prisma/client";
import { transformDecimalsToNumbers } from "@/lib/utils";

interface pageProps {
  params: {
    storeId: string;
  };
}
const StoreCheckoutPage: React.FC<pageProps> = async ({ params }) => {
  const store = (await sqlClient.store.findFirst({
    where: {
      id: params.storeId,
    },
    include: {
      Categories: {
        where: { isFeatured: true },
        orderBy: { sortOrder: "asc" },
      },
      //StoreAnnouncement: true,
      StoreShippingMethods: {
        include: {
          ShippingMethod: true,
        },
      },
      StorePaymentMethods: {
        include: {
          PaymentMethod: true,
        },
      },
    },
  })) as Store;

  if (!store) {
    redirect("/unv");
  }

  // if no payment methods associated with this store, use default payment methods
  if (store.StorePaymentMethods.length === 0) {
    const defaultPaymentMethods = (await sqlClient.paymentMethod.findMany({
      where: {
        isDefault: true,
      },
    })) as PaymentMethod[];

    defaultPaymentMethods.map((method) => {
      const mapping = {
        storeId: store.id,
        methodId: method.id,
        PaymentMethod: method,
      } as StorePaymentMethodMapping;

      transformDecimalsToNumbers(mapping);
      store.StorePaymentMethods.push(mapping);
    });
  }

  // if no shipping methods associated with this store, use default shipping methods
  if (store.StoreShippingMethods.length === 0) {
    const defaultShippingMethods = (await sqlClient.shippingMethod.findMany({
      where: {
        isDefault: true,
      },
    })) as ShippingMethod[];

    defaultShippingMethods.map((method) => {
      const mapping = {
        storeId: store.id,
        methodId: method.id,
        ShippingMethod: method,
      } as StoreShipMethodMapping;

      transformDecimalsToNumbers(mapping);
      store.StoreShippingMethods.push(mapping);
    });
  }

  //console.log(`store: ${JSON.stringify(store)}`);

  const user = await getUser();
  transformDecimalsToNumbers(user);

  transformDecimalsToNumbers(store);

  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <Checkout store={store} user={user} />
      </Container>
    </Suspense>
  );
};
export default StoreCheckoutPage;
