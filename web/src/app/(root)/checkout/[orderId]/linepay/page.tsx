import getOrderById from "@/actions/get-order-by_id";
import getStoreById from "@/actions/get-store-by_id";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import { Button } from "@/components/ui/button";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import {
  type Currency,
  type RequestRequestBody,
  type RequestRequestConfig,
  createLinePayClient,
  getLinePayClient,
} from "@/lib/linepay";
import type { LinePayClient } from "@/lib/linepay/type";
import { sqlClient } from "@/lib/prismadb";
import { isMobileUserAgent } from "@/lib/utils";
import type { Store, StoreOrder } from "@/types";
import { useQRCode } from "next-qrcode";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import PaymentLinePay from "./components/payment-linepay";
import isProLevel from "@/actions/storeAdmin/is-pro-level";

// customer select linepay as payment method. here we will make a payment request
// https://developers-pay.line.me/online
// https://developers-pay.line.me/online-api
// https://developers-pay.line.me/online/implement-basic-payment#confirm
const PaymentPage = async (props: { params: Promise<{ orderId: string }> }) => {
  const params = await props.params;
  if (!params.orderId) {
    throw new Error("order Id is missing");
  }
  const headerList = await headers();
  const host = headerList.get("host"); // stackoverflow.com
  //const pathname = headerList.get("x-current-path");
  //console.log("pathname", host, pathname);
  const isMobile = isMobileUserAgent(headerList.get("user-agent"));

  //console.log('orderId: ' + params.orderId);

  const order = (await getOrderById(params.orderId)) as StoreOrder;

  if (!order) {
    throw new Error("order not found");
  }
  //console.log('linepay order', JSON.stringify(order));

  if (order.isPaid) {
    return (
      <Suspense fallback={<Loader />}>
        <Container>
          <SuccessAndRedirect orderId={order.id} />
        </Container>
      </Suspense>
    );
  }
  const store = (await getStoreById(order.storeId)) as Store;

  // determine line pay id and secret
  let linePayId = store.LINE_PAY_ID;
  let linePaySecret = store.LINE_PAY_SECRET;

  // this store is pro version or not?
  const isPro = (await isProLevel(store?.id));
  console.log("isPro", isPro);

  if (isPro === false) {
    linePayId = process.env.LINE_PAY_ID || null;
    linePaySecret = process.env.LINE_PAY_SECRET || null;

    console.log('linePayId', linePayId, 'linePaySecret', linePaySecret);
  }

  if (!linePayId || !linePaySecret) {
    //
    return "尚未設定LinePay";
  }

  const linePayClient = getLinePayClient(
    linePayId, linePaySecret,
  ) as LinePayClient;

  const env =
    process.env.NODE_ENV === "development" ? "development" : "production";

  let protocol = "http:";
  if (env === "production") {
    protocol = "https:";
  }

  const confirmUrl = `${protocol}//${host}/checkout/${order.id}/linepay/confirmed`;
  const cancelUrl = `${protocol}//${host}/checkout/${order.id}/linepay/canceled`;

  const requestBody: RequestRequestBody = {
    amount: Number(order.orderTotal),
    currency: order.currency as Currency,
    orderId: order.id,
    packages: order.OrderItemView.map((item) => ({
      id: item.id,
      amount: Number(item.unitPrice) * item.quantity,
      products: [
        {
          name: item.name,
          quantity: item.quantity,
          price: Number(item.unitPrice),
        },
      ],
    })),
    redirectUrls: {
      confirmUrl: confirmUrl,
      cancelUrl: cancelUrl,
    },
  };

  //console.log("linepay request", JSON.stringify(requestBody));

  const requestConfig: RequestRequestConfig = {
    body: requestBody,
  };

  const res = await linePayClient.request.send(requestConfig);
  //console.log("linepay res", JSON.stringify(res));

  if (res.body.returnCode === "0000") {
    const weburl = res.body.info.paymentUrl.web;
    const appurl = res.body.info.paymentUrl.app;
    const transactionId = res.body.info.transactionId;
    const paymentAccessToken = res.body.info.paymentAccessToken;

    await sqlClient.storeOrder.update({
      where: {
        id: order.id,
      },
      data: {
        checkoutAttributes: transactionId,
        checkoutRef: paymentAccessToken,
      },
    });

    // for pc user, redirect to web
    // for mobile user, redirect to app
    if (isMobile) {
      redirect(appurl);
    } else {
      redirect(weburl);
    }
  }

  // something wrong
  console.error(res.body.returnMessage);
  throw new Error(res.body.returnMessage);
};

export default PaymentPage;
