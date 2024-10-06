import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";
import { Loader } from "@/components/ui/loader";
import type { Store } from "@/types";
import { Suspense } from "react";
import { PkgSelection } from "./pkgSelection";
import { sqlClient } from "@/lib/prismadb";

interface props {
  params: {
    storeId: string;
  };
}

const StoreSubscribePage: React.FC<props> = async ({ params }) => {
  const store = (await checkStoreAccess(params.storeId)) as Store;
  const subscription = await sqlClient.subscription.findUnique({
    where: {
      storeId: store.id
    }
  })
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
