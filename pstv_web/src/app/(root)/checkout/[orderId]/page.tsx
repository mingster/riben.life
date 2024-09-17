import { redirect } from "next/navigation";
import { StoreOrder } from "prisma/prisma-client";

// route to payment provider based on region and currency
//
const CheckoutHomePage = async ({
  params,
}: {
  params: { orderId: string };
}) => {
  //console.log('orderId: ' + params.orderId);

  if (!params.orderId) {
    throw new Error("order Id is missing");
  }

  //redirect(`./stripe/${params.orderId}`);

  return <></>;
};

export default CheckoutHomePage;
