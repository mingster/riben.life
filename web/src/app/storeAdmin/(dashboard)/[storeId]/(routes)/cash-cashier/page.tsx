import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";
import { Loader } from "@/components/ui/loader";

import getStoreWithCategories from "@/actions/get-store";
import type { Store } from "@/types";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CashCashier } from "./data-client";

interface props {
  params: {
    storeId: string;
  };
}

export const metadata: Metadata = {
  title: "Store Dashboard - Cash Cashier",
  description: "",
};

// DashboardPage is home of the selected store. It diesplays store operatiing stat such as
//total revenue, sales count, products, etc..
const CashCashierAdminPage: React.FC<props> = async ({ params }) => {
  await checkStoreAccess(params.storeId);
  const store = (await getStoreWithCategories(params.storeId)) as Store;

  return (
    <Suspense fallback={<Loader />}>
      <CashCashier store={store} />
    </Suspense>
  );
};

export default CashCashierAdminPage;
