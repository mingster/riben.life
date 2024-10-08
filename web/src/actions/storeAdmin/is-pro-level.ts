import { sqlClient } from "@/lib/prismadb";
import { StoreLevel } from "@/types/enum";
import type { Store } from "@prisma/client";

const isProLevel = async (
  storeId: string,
): Promise<boolean> => {
  if (!storeId) {
    throw Error("storeId is required");
  }

  const store = await sqlClient.store.findFirst({
    where: {
      id: storeId,
    },
  });
  if (!store) {
    return false;
  }

  if (store.level === StoreLevel.Free)
    return false;

  if (store.level === StoreLevel.Pro || store.level === StoreLevel.Multi) {
    const subscriptions = await sqlClient.subscription.findUnique({
      where: {
        storeId,
      }
    });

    if (subscriptions && subscriptions.expiration > new Date()) {
      return true;
    }
  }

  return false;
};

export default isProLevel;
