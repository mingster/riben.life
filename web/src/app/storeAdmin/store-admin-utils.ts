import checkStoreAdminAccess from "@/actions/storeAdmin/check-store-access";
import { authOptions } from "@/auth";
import { type Session, getServerSession } from "next-auth";
import { redirect } from "next/navigation";

// NOTE - protect storeAdmin route by redirect user to appropriate routes.
export const checkStoreAccess = async (storeId: string) => {
  //console.log('storeid: ' + params.storeId);
  const session = (await getServerSession(authOptions)) as Session;
  const userId = session?.user.id;

  if (!session) {
    redirect(`${process.env.NEXT_PUBLIC_API_URL}/auth/signin`);
  }

  const store = await checkStoreAdminAccess(storeId, userId);

  if (!store) {
    redirect("/storeAdmin");
  }

  return store;
};
