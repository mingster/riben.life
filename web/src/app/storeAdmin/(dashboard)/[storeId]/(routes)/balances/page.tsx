import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { Suspense } from "react";
import { MockupDashboardContent } from "../components/mockup-dashboard";

import isProLevel from "@/actions/storeAdmin/is-pro-level";
import type { Store } from "@prisma/client";
import "../../../../../css/addon.css";
import { sqlClient } from "@/lib/prismadb";

type Params = Promise<{ storeId: string; messageId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function BalanceMgmtPage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  const params = await props.params;
  const store = (await checkStoreAccess(params.storeId)) as Store;
  // this store is pro version or not?
  //const disablePaidOptions = await !isProLevel(store?.id);

  const legers = await sqlClient.storeLedger.findMany({
    where: {
      storeId: store.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  //        <MockupDashboardContent disablePaidOptions={disablePaidOptions} />

  console.log(JSON.stringify(legers));

  return (
    <Suspense fallback={<Loader />}>
      <Container>balances</Container>
    </Suspense>
  );
}
