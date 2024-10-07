import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";
import { Loader } from "@/components/ui/loader";
import type { Store } from "@/types";
import { Suspense } from "react";
import { PkgSelection } from "./pkgSelection";
import { sqlClient } from "@/lib/prismadb";
import type { Subscription, SubscriptionPayment } from "@prisma/client";
import { StoreLevel } from "@/types/enum";
import { stripe } from "@/lib/stripe/config";

interface props {
  params: {
    storeId: string;
  };
}

const StoreSubscribePage: React.FC<props> = async ({ params }) => {
  /*
  await sqlClient.subscription.deleteMany({
  });
  await sqlClient.subscriptionPayment.deleteMany({
  });
  await sqlClient.store.update({
    where: {
      id: params.storeId,
    },
    data: {
      level: StoreLevel.Free
    }
  });
  */

  const store = (await checkStoreAccess(params.storeId)) as Store;
  const subscription = await sqlClient.subscription.findUnique({
    where: {
      storeId: store.id,
    },
  });

  console.log("subscription", JSON.stringify(subscription));

  const subscriptionSchedule = subscription?.stripeSubscriptionId
    ? await stripe.subscriptionSchedules.retrieve(
        subscription.stripeSubscriptionId,
      )
    : null;

  console.log("subscriptionSchedule", JSON.stringify(subscriptionSchedule));

  return (
    <Suspense fallback={<Loader />}>
      <section className="relative w-full">
        <div className="container">
          <PkgSelection store={store} subscription={subscription} />
        </div>
      </section>
    </Suspense>
  );
};

export default StoreSubscribePage;
