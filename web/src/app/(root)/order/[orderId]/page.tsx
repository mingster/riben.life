import getOrderById from "@/actions/get-order-by_id";
import { useTranslation } from "@/app/i18n";
import { AskUserToSignIn } from "@/components/ask-user-to-signIn";
import { Navbar } from "@/components/global-navbar";
import { DisplayOrder } from "@/components/order-display";
import { Button } from "@/components/ui/button";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import type { Store } from "@/types";
import Link from "next/link";
import { Suspense } from "react";

/*
interface pageProps {
  params: {
    storeId: string;
    orderId: string;
  };
}
//NOTE - this page shows order status for anonymous users (the kind of users choose not to sign in).
//
const StoreOrderStatusPage: React.FC<pageProps> = async props => {
  const params = await props.params;
  const store = (await sqlClient.store.findFirst({
    where: {
      id: params.storeId,
    },
  })) as Store;
  transformDecimalsToNumbers(store);

  const { t } = await useTranslation(store?.defaultLocale || "en");
          <h1 className="text-4xl sm:text-xl pb-2">{t("order_view_title")}</h1>
              {t("cart_summary_keepShopping")}

  const order = await getOrderById(params.orderId);
  if (!order) {
    return "no order found";
  }

  return (
    <Suspense fallback={<Loader />}>
      <div className="bg-no-repeat bg-[url('/images/beams/hero@75.jpg')] dark:bg-[url('/images/beams/hero-dark@90.jpg')]">
        <Navbar title="" />
        <Container>
          <h1 className="text-4xl sm:text-xl pb-2">購物明細</h1>

          <DisplayOrder order={order} />

          <Link href="/" className="">
            <Button className="w-full">
              繼續選購
            </Button>{" "}
          </Link>

          <AskUserToSignIn />
        </Container>
      </div>
    </Suspense>
  );
};
export default StoreOrderStatusPage;
*/

type Params = Promise<{ storeId: string; orderId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreOrderStatusPage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  const params = await props.params;
  const orderId = params.orderId;

  //const searchParams = await props.searchParams;
  //const query = searchParams.query;

  const order = await getOrderById(orderId);
  if (!order) {
    return "no order found";
  }

  return (
    <Suspense fallback={<Loader />}>
      <div className="bg-no-repeat bg-[url('/images/beams/hero@75.jpg')] dark:bg-[url('/images/beams/hero-dark@90.jpg')]">
        <Navbar title="" />
        <Container>
          <h1 className="text-4xl sm:text-xl pb-2">購物明細</h1>

          <DisplayOrder order={order} />

          <Link href="/" className="">
            <Button className="w-full">繼續選購</Button>{" "}
          </Link>

          <AskUserToSignIn />
        </Container>
      </div>
    </Suspense>
  );
}
