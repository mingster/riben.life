import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";
//import Scheduled from "@/components/scheduled";
//import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import { OrderStatus, TicketStatus } from "@/types/enum";
import type { StoreOrder, SupportTicket } from "@prisma/client";
import type { Store } from "@/types";

import type { Metadata } from "next";
import { Suspense } from "react";

import { transformDecimalsToNumbers } from "@/lib/utils";
import { PkgSelection } from "./pkgSelection";

//import StoreDashbard from './components/store-dashbard';<StoreDashbard storeId={params.storeId} />

interface DashboardPageProps {
  params: {
    storeId: string;
  };
}

// DashboardPage is home of the selected store. It diesplays store operatiing stat such as
//total revenue, sales count, products, etc..
const StoreSubscribePage: React.FC<DashboardPageProps> = async ({ params }) => {
  const store = (await checkStoreAccess(params.storeId)) as Store;

  return (
    <Suspense fallback={<Loader />}>
      <section className="relative w-full">
        <div className="container">
          <PkgSelection store={store} />
        </div>
      </section>
    </Suspense>
  );
};

export default StoreSubscribePage;
