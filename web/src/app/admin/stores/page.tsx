import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import { format } from "date-fns";

import type { Store } from "@/types";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { StoreColumn } from "./components/columns";
import { StoresClient } from "./components/stores-client";

import { auth } from "@/auth";
import type { Session } from "next-auth";

//import { Metadata } from 'next';
interface pageProps {
  params: {
    storeId: string;
  };
}

// here we save store settings to mangodb
//
const StoreAdminPage: React.FC<pageProps> = async ({ params }) => {
  //console.log('storeid: ' + params.storeId);
  const session = (await auth()) as Session;
  const userId = session?.user.id;

  if (!session) {
    redirect(`${process.env.NEXT_PUBLIC_API_URL}/auth/signin`);
  }

  const stores = await sqlClient.store.findMany({
    include: {
      Categories: true,
      StoreAnnouncement: true,
      Owner: true,
      Products: true,
      StoreOrders: true,
      StoreShippingMethods: true,
      StorePaymentMethods: true,
    },
  });

  //console.log(`users: ${JSON.stringify(users)}`);

  // map user to ui
  const formattedStores: StoreColumn[] = stores.map((item: Store) => {
    return {
      id: item.id,
      name: item.name || "",
      customDomain: item.customDomain || "",
      owner: item.Owner.email || item.Owner.name || "",
      createdAt: format(item.updatedAt, "yyyy-MM-dd"),
      products: item.Products.length,
      storeOrders: item.StoreOrders.length,
    };
  });

  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <StoresClient data={formattedStores} />
      </Container>
    </Suspense>
  );
};

export default StoreAdminPage;
