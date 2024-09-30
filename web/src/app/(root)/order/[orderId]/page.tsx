import getUser from "@/actions/get-user";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type {
  Store,
  StorePaymentMethodMapping,
  StoreShipMethodMapping,
} from "@/types";
import type { PaymentMethod, ShippingMethod } from "@prisma/client";
import { transformDecimalsToNumbers } from "@/lib/utils";

interface pageProps {
  params: {
    storeId: string;
    orderId: string;
  };
}
//NOTE - this page shows order status for anonymous users (the kind of users choose not to sign in).
//
const StoreOrderStatusPage: React.FC<pageProps> = async ({ params }) => {
  const store = (await sqlClient.store.findFirst({
    where: {
      id: params.storeId,
    },
    include: {
      Categories: {
        where: { isFeatured: true },
        orderBy: { sortOrder: "asc" },
      },
      StoreAnnouncement: true,
      StoreShippingMethods: true,
      StorePaymentMethods: true,
    },
  })) as Store;

  transformDecimalsToNumbers(store);
  
  if (!store) {
    redirect("/unv");
  }


  return (
    <Suspense fallback={<Loader />}>
      <Container>購物明細</Container>
    </Suspense>
  );
};
export default StoreOrderStatusPage;
