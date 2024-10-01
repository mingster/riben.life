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
import { DisplayOrder } from "@/components/order-display";
import type { StoreOrder } from "@/types";
import { Navbar } from "@/components/global-navbar";
import getOrderById from "@/actions/get-order-by_id";

interface pageProps {
  params: {
    storeId: string;
    orderId: string;
  };
}
//NOTE - this page shows order status for anonymous users (the kind of users choose not to sign in).
//
const StoreOrderStatusPage: React.FC<pageProps> = async ({ params }) => {
  /*
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
  */

  const order = await getOrderById(params.orderId);
  if (!order) {
    return "no order found";
  }

  return (
    <Suspense fallback={<Loader />}>
      <Navbar title="" />
      <Container>
        <h1>購物明細</h1>
        <DisplayOrder order={order} />
      </Container>
    </Suspense>
  );
};
export default StoreOrderStatusPage;
