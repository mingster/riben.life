'use server'

import { auth } from "@/auth";
import type { Session } from "next-auth";
import { redirect } from 'next/navigation'

export async function checkAdminAccess() {

  //console.log('storeid: ' + params.storeId);
  const session = (await auth()) as Session;

  if (!session) {
    return false;
  }

  if (!session.user) {
    return false;
  }

  console.log('admin user', session.user.email, session.user.role);

  // block if not admin
  if (session.user.role !== "ADMIN" && session.user.email !== "mingster.tsai@gmail.com") {
    //throw new Error("Unauthorized");
    return false;
  }

  return true;
}
