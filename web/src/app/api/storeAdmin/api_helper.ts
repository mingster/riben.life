import checkStoreAdminAccess from "@/actions/storeAdmin/check-store-access";

import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";
import { IsSignInResponse } from "@/utils/auth-utils";
//import type { Store } from "@prisma/client";

// returns all countries currently in db
export async function CheckStoreAdminAccess(storeId: string) {
  try {
    const userId = await IsSignInResponse();
    if (typeof userId !== "string") {
      return new NextResponse("Unauthenticated", { status: 400 });
    }

    if (!storeId) {
      return new NextResponse("Store id is required", { status: 401 });
    }

    const test = await sqlClient.store.findFirst({
      where: {
        id: storeId,
        ownerId: userId,
      },
    });

    //const test = await checkStoreAdminAccess(storeId, userId);

    if (!test) {
      return new NextResponse("Unauthenticated", { status: 402 });
    }

    return true;
  } catch (error) {
    console.error("[CheckAccess]", error);
    return false;
  }
}
