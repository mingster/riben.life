import getOrderById from "@/actions/get-order-by_id";
import type { StoreOrder } from "@/types";

import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
import Container from "@/components/ui/container";
import { SuccessAndRedirect } from "@/components/success-and-redirect";

const CashPaymentPage = async ({ params }: { params: { orderId: string } }) => {
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
