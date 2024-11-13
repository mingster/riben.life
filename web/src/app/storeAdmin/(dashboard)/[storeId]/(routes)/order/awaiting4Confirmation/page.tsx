import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";
//import Scheduled from "@/components/scheduled";
//import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import type { Store } from "@/types";

import type { Metadata } from "next";
import { Suspense } from "react";
import { Awaiting4ConfirmationClient } from "./client";
import Container from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Store Dashboard",
  description: "",
};

// DashboardPage is home of the selected store. It diesplays store operatiing stat such as
//total revenue, sales count, products, etc..

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function OrderAwaiting4ConfirmationPage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  const params = await props.params;

  const store = (await checkStoreAccess(params.storeId)) as Store;

  /*
  const pendingOrders = (await sqlClient.storeOrder.findMany({
    where: {
      storeId: params.storeId,
      orderStatus: Number(OrderStatus.Processing),
    },
  })) as StoreOrder[];
  const pendingTickets = (await sqlClient.supportTicket.findMany({
    where: {
      storeId: params.storeId,
      status: TicketStatus.Active || TicketStatus.Open,
    },
  })) as SupportTicket[];
  //console.log(`pendingOrders: ${JSON.stringify(pendingOrders)}`);

  <Container>
        <Scheduled timestamp={Date.now()}>
          <div>{Date.now().toString()}</div>
          <div>
            <span className="text-2xl">{pendingTickets.length}</span> open
            tickets
          </div>
          <div>
            <span className="text-2xl">{pendingOrders.length}</span> pending
            orders
          </div>
        </Scheduled>
      </Container>

  */

  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <Awaiting4ConfirmationClient store={store} />
      </Container>
    </Suspense>
  );
}
