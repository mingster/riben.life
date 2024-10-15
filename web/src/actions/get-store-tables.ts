import { sqlClient } from "@/lib/prismadb";

import type { StoreTables } from "@prisma/client";

const getStoreTables = async (storeId: string): Promise<StoreTables[]> => {
  if (!storeId) {
    throw Error("storeId is required");
  }

  const tables = await sqlClient.storeTables.findMany({
    where: {
      storeId: storeId,
    },
    orderBy: {
      tableName: "asc",
    },
  });

  return tables;
};
export default getStoreTables;
