import { Toaster } from "@/components/ui/toaster";
import { GetSession, RequiresSignIn } from "@/lib/auth/utils";
import { mongoClient, sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import StoreAdminLayout from "./components/store-admin-layout";
//import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";

export default async function StoreLayout(props: {
  children: React.ReactNode;
  params: Promise<{ storeId: string }>;
}) {
  const params = await props.params;

  const { children } = props;

  RequiresSignIn();
  const session = (await GetSession()) as Session;

  //console.log('session: ' + JSON.stringify(session));
  //console.log('userId: ' + user?.id);

  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    console.log("access denied");
    redirect("/error/?code=500");
  }

  //const chk = (await checkStoreAccess(params.storeId));

  const store = await sqlClient.store.findFirst({
    where: {
      id: params.storeId,
      ownerId: session.user?.id,
    },
    include: {
      Owner: true,
      Products: true,
      StoreOrders: {
        orderBy: {
          updatedAt: "desc",
        },
      },
      StoreShippingMethods: {
        include: {
          ShippingMethod: true,
        },
      },
      StorePaymentMethods: {
        include: {
          PaymentMethod: true,
        },
      },
      Categories: true,
      StoreAnnouncement: {
        orderBy: {
          updatedAt: "desc",
        },
      },
    },
  });

  if (!store) {
    console.log("no access to the store...redirect to store creation page.");
    redirect("/storeAdmin");
  }

  transformDecimalsToNumbers(store);

  return (
    <StoreAdminLayout sqlData={store} mongoData={null}>
      {children}
      <Toaster />
    </StoreAdminLayout>
  );
}
