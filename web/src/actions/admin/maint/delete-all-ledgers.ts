"use server";
import { sqlClient } from "@/lib/prismadb";
import { redirect } from "next/navigation";

export const deleteAllLedgers = async () => {
  const { count } = await sqlClient.storeLedger.deleteMany({
    where: {
      //storeId: params.storeId,
    },
  });

  console.log(`${count} ledger deleted.`);
  redirect("/admin/maint");

  return count;
};
