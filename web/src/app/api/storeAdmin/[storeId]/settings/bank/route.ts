import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckStoreAdminAccess } from "../../../api_helper";
import { GetSession, IsSignInResponse } from "@/utils/auth-utils";
import type { Session } from "next-auth";

export async function PATCH(
  req: Request,
  { params }: { params: { storeId: string } },
) {
  try {
    CheckStoreAdminAccess(params.storeId);

    const userId = await IsSignInResponse();
    if (typeof userId !== "string") {
      return new NextResponse("Unauthenticated", { status: 400 });
    }

    const body = await req.json();
    //const { customDomain, logo, logoPublicId, acceptAnonymousOrder } = body;

    const store = await sqlClient.store.update({
      where: {
        id: params.storeId,
        ownerId: userId,
      },
      data: {
        ...body,
        updatedAt: new Date(Date.now()),
      },
    });

    return NextResponse.json(store);
  } catch (error) {
    console.log("[STORE_PATCH]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
