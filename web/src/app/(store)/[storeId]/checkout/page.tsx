import getUser from "@/actions/get-user";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Checkout } from "./client";
import type {
  Store,
  StorePaymentMethodMapping,
  StoreShipMethodMapping,
} from "@/types";
import type { PaymentMethod, ShippingMethod } from "@prisma/client";
import { transformDecimalsToNumbers } from "@/lib/utils";
import getStoreWithCategories from "@/actions/get-store";

interface pageProps {
  params: {
    storeId: string;
  };
}
const StoreCheckoutPage: React.FC<pageProps> = async ({ params }) => {
  const store = (await getStoreWithCategories(params.storeId)) as Store;

  if (!store) {
    redirect("/unv");
  }

  //console.log(`store: ${JSON.stringify(store)}`);

  const user = await getUser();
  transformDecimalsToNumbers(user);

  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <Checkout store={store} user={user} />
      </Container>
    </Suspense>
  );
};
export default StoreCheckoutPage;
