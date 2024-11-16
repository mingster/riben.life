import getOrderById from "@/actions/get-order-by_id";
import type { StoreOrder } from "@/types";

import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { Suspense } from "react";

/*
const CashPaymentPage = async (props: { params: Promise<{ orderId: string }> }) => {
  const params = await props.params;
  //console.log('orderId: ' + params.orderId);

  if (!params.orderId) {
    throw new Error("order Id is missing");
  }

  const order = (await getOrderById(params.orderId)) as StoreOrder;
  //console.log('order: ' + JSON.stringify(order));

  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <SuccessAndRedirect orderId={order.id} />
      </Container>
    </Suspense>
  );
};
export default CashPaymentPage;
*/

type Params = Promise<{ orderId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function CashPaymentPage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const orderId = params.orderId;
  const query = searchParams.query;

  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <SuccessAndRedirect orderId={orderId} />
      </Container>
    </Suspense>
  );
}
