"use server";

import { auth } from "@/auth";
import type { Session } from "next-auth";

import { IsSignInResponse } from "@/lib/auth/utils";
import { sqlClient } from "@/lib/prismadb";
import { revalidatePath } from "next/cache";
import type { StoreNotification } from "prisma/prisma-client";
//import type { StoreNotification } from "@/types";

export async function CreateNotification(values: StoreNotification) {
  const session = (await auth()) as Session;
  //const session = (await getServerSession(authOptions)) as Session;
  const userId = IsSignInResponse();
  if (typeof userId !== "string") {
    throw Error("Unauthorized");
  }

  const email = session?.user?.email;

  if (!email) {
    throw Error("Unauthorized");
  }

  const obj = await sqlClient.storeNotification.create({
    data: { ...values },
  });

  revalidatePath("/");
}
