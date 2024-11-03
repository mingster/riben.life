"use server";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { Suspense } from "react";
import { CancelAndRedirect } from "./cancelAndRedirect";

// https://developers-pay.line.me/merchant/redirection-pages/
// cancel page is called when user
export default async function LinePayCancelledPage({
  searchParams,
}: {
  searchParams: {
    orderId: string;
    transactionId: string;
  };
}) {
  console.log(searchParams.orderId, searchParams.transactionId);

  if (!searchParams.orderId) {
    throw new Error("order Id is missing");
  }

  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <CancelAndRedirect orderId={searchParams.orderId} /></Container>
    </Suspense>
  );
}
