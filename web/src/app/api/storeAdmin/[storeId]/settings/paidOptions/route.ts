import checkStoreAdminAccess from "@/actions/storeAdmin/check-store-access";
import { authOptions } from "@/auth";
import { sqlClient } from "@/lib/prismadb";
import { type Session, getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { CheckStoreAdminAccess } from "../../../api_helper";

export async function PATCH(
  req: Request,
  { params }: { params: { storeId: string } },
) {
  try {
    CheckStoreAdminAccess(params.storeId);

    const session = (await getServerSession(authOptions)) as Session;
    const userId = session?.user.id;

    if (!userId) {
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
