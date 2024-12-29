"use server";
import { sqlClient } from "@/lib/prismadb";
import { redirect } from "next/navigation";

export const deleteAllOrders = async () => {
  const { count } = await sqlClient.storeOrder.deleteMany({
    where: {
      //storeId: params.storeId,
    },
  });

  console.log(`${count} order deleted.`);

  redirect("/admin/maint");

  return count;
};
