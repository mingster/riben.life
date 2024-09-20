import checkStoreAdminAccess from "@/actions/storeAdmin/check-store-access";
import { sqlClient } from "@/lib/prismadb";

import { NextResponse } from "next/server";
import { CheckStoreAdminAccess } from "../../api_helper";
import { IsSignInResponse } from "@/utils/auth-utils";

///!SECTION create Category record in database.
export async function POST(
  req: Request,
  { params }: { params: { storeId: string } },
) {
  try {
    const userId = await IsSignInResponse();
    if (typeof userId !== "string") {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    CheckStoreAdminAccess(params.storeId);

    const body = await req.json();
    const obj = await sqlClient.storeAnnouncement.create({
      data: {
        storeId: params.storeId,
        ...body,
        updatedAt: new Date(Date.now()),
      },
    });

    //console.log(`create announcement: ${JSON.stringify(obj)}`);

    return NextResponse.json(obj);
  } catch (error) {
    console.log("[StoreAnnouncement_POST]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
