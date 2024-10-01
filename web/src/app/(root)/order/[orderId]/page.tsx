import getOrderById from "@/actions/get-order-by_id";
import { useTranslation } from "@/app/i18n";
import { Navbar } from "@/components/global-navbar";
import { DisplayOrder } from "@/components/order-display";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import type { Store } from "@/types";
import { Suspense } from "react";

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
  })) as Store;
  transformDecimalsToNumbers(store);
  const { t } = await useTranslation(store?.defaultLocale || "en");

  const order = await getOrderById(params.orderId);
  if (!order) {
    return "no order found";
  }

  return (
    <Suspense fallback={<Loader />}>
      <div className="bg-no-repeat bg-[url('/images/beams/hero@75.jpg')] dark:bg-[url('/images/beams/hero-dark@90.jpg')]">
        <Navbar title="" />
        <Container>
          <h1 className="text-4xl sm:text-xl pb-2">{t("order_view_title")}</h1>
          <DisplayOrder order={order} />
        </Container>
      </div>
    </Suspense>
  );
};
export default StoreOrderStatusPage;
