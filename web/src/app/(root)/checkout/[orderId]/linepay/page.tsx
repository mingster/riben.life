import getOrderById from "@/actions/get-order-by_id";
import type { StoreOrder } from "@/types";
import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
import Container from "@/components/ui/container";
import { SuccessAndRedirect } from "@/components/success-and-redirect";

// 
// https://developers-pay.line.me/online-api
const PaymentPage = async ({ params }: { params: { orderId: string } }) => {
  //console.log('orderId: ' + params.orderId);

  if (!params.orderId) {
    throw new Error("order Id is missing");
  }

  /*
    const session = await getServerSession(authOptions);
    if (!session) {
      //if (status != 'authenticated') {
      redirect(`${process.env.NEXT_PUBLIC_API_URL}/auth/signin`);
    }
    //get user with needed assoicated objects
    //
    const userId = session?.user.id;
    */

  const order = (await getOrderById(params.orderId)) as StoreOrder;
  //console.log('order: ' + JSON.stringify(order));

  if (order.isPaid) {
    return (
      <Suspense fallback={<Loader />}>
        <Container>
          <SuccessAndRedirect orderId={order.id} />
        </Container>
      </Suspense>
    );
  }

  return (
    <div className="pl-5 pr-5 pt-10">

    </div>
  );
};

export default PaymentPage;
