"use client";

import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { Suspense } from "react";

import { useI18n } from "@/providers/i18n-provider";
import { useTranslation } from "@/app/i18n/client";
import { useParams } from "next/navigation";

interface pageProps {
  params: {
    storeId: string;
    orderId: string;
  };
}

const CheckoutSuccessPage: React.FC<pageProps> = ({ params }) => {
  const { lng } = useI18n();
  const { t } = useTranslation(lng);

  //when we get here, the checkout cart item should be removed
  //
  /* this code causes client side error
'use client';
  import useCart from '@/hooks/use-cart';
  try {
    const cart = useCart();
    cart.removeAll();
  } catch (e) {
    console.error(e);
  }
  */
  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <SuccessAndRedirect orderId={params.orderId} />
      </Container>
    </Suspense>
  );
};
export default CheckoutSuccessPage;
