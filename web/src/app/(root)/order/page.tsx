import { Navbar } from "@/components/global-navbar";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import type { Store } from "@/types";
import { Suspense } from "react";
import { DisplayStoreOrdersToday } from "./display-order-today";

interface pageProps {
  params: {
    storeId: string;
  };
}

// 點餐記錄 - show order history from local storage.
//NOTE - why local storage?  because we allow anonymous user to place order.
//
const StoreOrderStatusPage: React.FC<pageProps> = async ({ params }) => {
  // show my account -> order page if user is signed in
  /*
  const user = (await getUser()) as User;
  if (user) {
    redirect('/account');
  }
  */

  // we will use DisplayStoreOrdersToday to link orders to user
  // should user decide to sign in.

  // otherwise use local storage to show orders
  const store = (await sqlClient.store.findFirst({
    where: {
      id: params.storeId,
    },
  })) as Store;
  transformDecimalsToNumbers(store);

  //const { t } = await useTranslation(store?.defaultLocale || "en");

  return (
    <Suspense fallback={<Loader />}>
      <div className="bg-no-repeat bg-[url('/images/beams/hero@75.jpg')] dark:bg-[url('/images/beams/hero-dark@90.jpg')]">
        <Navbar title="" />
        <Container>
          <DisplayStoreOrdersToday />
        </Container>
      </div>
    </Suspense>
  );
};
export default StoreOrderStatusPage;
