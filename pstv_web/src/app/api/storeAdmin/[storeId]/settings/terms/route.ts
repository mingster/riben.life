import checkStoreAdminAccess from "@/actions/storeAdmin/check-store-access";
import { authOptions } from "@/auth";
import { mongoClient } from "@/lib/prismadb";
import { type Session, getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { CheckStoreAdminAccess } from "../../../api_helper";

//NOTE - update privacy policy of the store
export async function PATCH(
  req: Request,
  { params }: { params: { storeId: string } },
) {
  try {
    CheckStoreAdminAccess(params.storeId);

    const body = await req.json();

    const { tos } = body;

    const storeSettings = await mongoClient.storeSettings.upsert({
      where: {
        databaseId: params.storeId,
      },
      update: { tos, updatedAt: new Date(Date.now()) },
      create: {
        tos,
        databaseId: params.storeId,
      },
    });

    //console.log(`storeSettings: ${JSON.stringify(storeSettings)}`);

    return NextResponse.json(storeSettings);
  } catch (error) {
    console.log("[STORE_PATCH]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
