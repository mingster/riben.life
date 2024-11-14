import getOrderById from "@/actions/get-order-by_id";
import getStoreById from "@/actions/get-store-by_id";
import { Loader } from "@/components/ui/loader";
import type { Store } from "@/types";
import { Suspense } from "react";
import { DisplayClient } from "./client";

type Params = Promise<{ storeId: string; orderId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreOrderStatusPage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  const params = await props.params;
  const orderId = params.orderId;

  //const searchParams = await props.searchParams;
  //const query = searchParams.query;

  const order = await getOrderById(orderId);

  if (!order) {
    return "no order found";
  }

  const store = (await getStoreById(order.storeId)) as Store;

  return (
    <Suspense fallback={<Loader />}>
      <DisplayClient store={store} order={order} />
    </Suspense>
  );
}
