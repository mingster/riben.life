import checkStoreAdminAccess from "@/actions/storeAdmin/check-store-access";
import { authOptions } from "@/auth";
import { sqlClient } from "@/lib/prismadb";
import { type Session, getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { CheckStoreAdminAccess } from "../../../api_helper";

///!SECTION update Category record in database.
export async function PATCH(
  req: Request,
  { params }: { params: { storeId: string; messageId: string } },
) {
  try {
    CheckStoreAdminAccess(params.storeId);

    if (!params.messageId) {
      return new NextResponse("announcement id is required", { status: 401 });
    }

    const body = await req.json();
    const obj = await sqlClient.storeAnnouncement.update({
      where: {
        id: params.messageId,
      },
      data: { ...body, updatedAt: new Date(Date.now()) },
    });

    //console.log(`update announcement: ${JSON.stringify(obj)}`);

    return NextResponse.json(obj);
  } catch (error) {
    console.log("[StoreAnnouncement_PATCH]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}

///!SECTION delete Category record in database.
export async function DELETE(
  req: Request,
  { params }: { params: { storeId: string; messageId: string } },
) {
  //try {
  const session = (await getServerSession(authOptions)) as Session;
  const userId = session?.user.id;
  if (!userId) {
    return new NextResponse("Unauthenticated", { status: 403 });
  }
  if (!params.storeId) {
    return new NextResponse("Store id is required", { status: 400 });
  }

  if (!params.messageId) {
    return new NextResponse("message id is required", { status: 401 });
  }

  //const body = await req.json();
  const obj = await sqlClient.storeAnnouncement.delete({
    where: {
      id: params.messageId,
    },
  });

  //console.log(`delete announcement: ${JSON.stringify(obj)}`);

  return NextResponse.json(obj);
  /*
  } catch (error) {
    console.log("[StoreAnnouncement_DELETE]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
     */
}
