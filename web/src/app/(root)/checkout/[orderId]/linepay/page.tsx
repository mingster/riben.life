import getOrderById from "@/actions/get-order-by_id";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import type { StoreOrder } from "@/types";
import { Suspense } from "react";
import PaymentLinePay from "./components/payment-linepay";
import { createLinePayClient } from "@/lib/linepay";
import type { LinePayClient } from "@/lib/linepay/type";

// customer select linepay as payment method. here we will make a payment request
// https://developers-pay.line.me/online
// https://developers-pay.line.me/online-api
const PaymentPage = async ({ params }: { params: { orderId: string } }) => {
  if (!params.orderId) {
    throw new Error("order Id is missing");
  }

  const order = (await getOrderById(params.orderId)) as StoreOrder;
  //console.log('orderId: ' + params.orderId);

  if (!order) {
    throw new Error("order not found");
  }
  //console.log('linepay order', JSON.stringify(order));

  if (!process.env.LNE_PAY_ID) {
    throw new Error('LNE_PAY_ID is not set');
  }
  if (!process.env.LINE_PAY_SECRET) {
    throw new Error('LINE_PAY_SECRET is not set');
  }
  const env = process.env.NODE_ENV === 'development' ? 'development' : 'production';

  const linePayClient = createLinePayClient({
    channelId: process.env.LNE_PAY_ID,
    channelSecretKey: process.env.LINE_PAY_SECRET,
    env: env // env can be 'development' or 'production'
  }) as LinePayClient;


  const confirmUrl = `/checkout/${order.id}/linepay/confirmed`;
  const cancelUrl = `/checkout/${order.id}/linepay/canceled`;

  const requestBody = {
    amount: order.orderTotal,
    currency: order.currency,
    orderId: order.id,
    packages: [
      order.OrderItemView.map((item) => {
        return {
          id: item.id,
          amount: Number(item.unitPrice) * item.quantity,
          products: [
            {
              name: item.name,
              quantity: item.quantity,
              price: item.unitPrice
            }
          ]
        };
      })],
    redirectUrls: {
      confirmUrl: confirmUrl,
      cancelUrl: cancelUrl
    }
  };
  console.log('linepay request', JSON.stringify(requestBody));


  if (order.isPaid) {
    return (
      <Suspense fallback={<Loader />}>
        <Container>
          <SuccessAndRedirect orderId={order.id} />
        </Container>
      </Suspense>
    );
  }

  return (<>line pay</>);
};

export default PaymentPage;
