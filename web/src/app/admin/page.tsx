import { Loader } from "@/components/ui/loader";
import { Suspense } from "react";
import { AdminMockupContent } from "./components/admin-mockup-content";
import { checkAdminAccess } from "./admin-utils";
import { redirect } from "next/navigation";
import { sqlClient } from "@/lib/prismadb";
import { Sub } from "@radix-ui/react-dropdown-menu";
import { SubscriptionStatus } from "@/types/enum";

//
//
export default async function AdminPage() {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) redirect("/error/?code=500&message=Unauthorized");

  const storeCount = await sqlClient.store.count();
  const customerCount = await sqlClient.user.count();
  const orderCount = await sqlClient.storeOrder.count();
  const productCount = await sqlClient.product.count();

  const subscriptionCount = await sqlClient.subscription.count({
    where: {
      status: Number(SubscriptionStatus.Active),
    },
  })

  return (
    <Suspense fallback={<Loader />}>
      <AdminMockupContent />
      <div className="container relative pb-10">
        <section className="mx-auto flex max-w-[980px] flex-col items-center gap-2 py-8 md:py-12 md:pb-8 lg:py-24 lg:pb-6">
          <div className="grid grid-cols-3 gap-4">
            <div># of store: <span className='text-2xl font-extrabold'>{storeCount}</span></div>
            <div># of subscription: <span className='text-2xl font-extrabold'>{subscriptionCount}</span></div>
            <div># of customer: <span className='text-2xl font-extrabold'>{customerCount}</span></div>
            <div># of order: <span className='text-2xl font-extrabold'>{orderCount}</span></div>
            <div># of product: <span className='text-2xl font-extrabold'>{productCount}</span></div>
          </div>
        </section>
      </div>
    </Suspense>
  );
}
