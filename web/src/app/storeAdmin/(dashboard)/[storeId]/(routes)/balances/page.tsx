import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import type { Metadata } from "next";
import { Suspense } from "react";
import { MockupDashboardContent } from "../components/mockup-dashboard";

import type { Store } from "@prisma/client";
import "../../../../../css/addon.css";
import isProLevel from "@/actions/storeAdmin/is-pro-level";

//import { Metadata } from 'next';
interface pageProps {
  params: {
    storeId: string;
  };
  
}

const BalanceMgmtPage: React.FC<pageProps> = async ({ params }) => {
  const store = (await checkStoreAccess(params.storeId)) as Store;
  // this store is pro version or not?
  const disablePaidOptions = await isProLevel(store?.id);

  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <MockupDashboardContent disablePaidOptions={disablePaidOptions} />
      </Container>
    </Suspense>
  );
};

export default BalanceMgmtPage;
