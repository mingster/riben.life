import { Toaster } from "@/components/ui/toaster";
import { sqlClient } from "@/lib/prismadb";
import { GetSession, RequiresSignIn } from "@/utils/auth-utils";
import type { Session } from "next-auth";

import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { storeId: string };
}) {
  RequiresSignIn();
  const session = (await GetSession()) as Session;
  const ownerId = session.user?.id;

  if (!session || !session.user || !ownerId) {
    redirect(`${process.env.NEXT_PUBLIC_API_URL}/auth/signin`);
  }

  //console.log('userid: ' + userId);

  let storeId = params.storeId;
  if (!storeId) {
    const store = await sqlClient.store.findFirst({
      where: {
        ownerId: session.user.id,
      },
    });

    if (store) storeId = store?.id;
  }

  //console.log('storeId: ' + storeId);
  //console.log('ownerId: ' + session.user.id);

  // redirect user to `/storeAdmin/${store.id}` if the user is already a store owner
  if (storeId) {
    redirect(`/storeAdmin/${storeId}`);
  }

  //console.log('userId: ' + user?.id);
  /*

  if (session.user.role != 'OWNER') {
    console.log('access denied');
    redirect('/error/?code=500');

  }

  //console.log('store: ' + JSON.stringify(store));
*/
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
