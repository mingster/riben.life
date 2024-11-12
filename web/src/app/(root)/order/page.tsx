import { Navbar } from "@/components/global-navbar";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import type { Store } from "@/types";
import { Suspense } from "react";
import { DisplayStoreOrdersToday } from "./display-order-today";

// 點餐記錄 - show order history from local storage.
//NOTE - why local storage?  because we allow anonymous user to place order.
//
type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreOrderStatusPage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  /*
  const params = await props.params;
  // otherwise use local storage to show orders
  const store = (await sqlClient.store.findFirst({
    where: {
      id: params.storeId,
    },
  })) as Store;
  transformDecimalsToNumbers(store);
  */

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
}
