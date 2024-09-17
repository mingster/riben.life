"use server";

//import { auth } from "@/auth";
import { authOptions } from "@/auth";
import { type Session, getServerSession } from "next-auth";

import { sqlClient } from "@/lib/prismadb";
import { revalidatePath } from "next/cache";
import type { StoreNotification } from "prisma/prisma-client";
//import type { StoreNotification } from "@/types";

export async function CreateNotification(values: StoreNotification) {
  //const session = await auth();
  const session = (await getServerSession(authOptions)) as Session;

  const email = session?.user?.email;

  if (!email) {
    throw Error("Unauthorized");
  }

  const obj = await sqlClient.storeNotification.create({
    data: { ...values },
  });

  revalidatePath("/");
}
