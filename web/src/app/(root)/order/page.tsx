import getOrderById from "@/actions/get-order-by_id";
import { useTranslation } from "@/app/i18n";
import { AskUserToSignIn } from "@/components/ask-user-to-signIn";
import { Navbar } from "@/components/global-navbar";
import { DisplayOrder } from "@/components/order-display";
import { Button } from "@/components/ui/button";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { getOrdersToday } from "@/lib/order-history";
import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import type { Store, StoreOrder } from "@/types";
import Link from "next/link";
import { Suspense } from "react";
import { DisplayStoreOrdersToday } from "./display-order-today";

interface pageProps {
  params: {
    storeId: string;
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

  return (
    <Suspense fallback={<Loader />}>
      <div className="bg-no-repeat bg-[url('/images/beams/hero@75.jpg')] dark:bg-[url('/images/beams/hero-dark@90.jpg')]">
        <Navbar title="" />
        <Container>
          <h1 className="text-4xl sm:text-xl pb-2">{t("order_view_title")}</h1>

          <DisplayStoreOrdersToday />

          <Link href="/" className="">
            <Button className="w-full">
              {t("cart_summary_keepShopping")}
            </Button>{" "}
          </Link>

          <AskUserToSignIn />
        </Container>
      </div>
    </Suspense>
  );
};
export default StoreOrderStatusPage;
