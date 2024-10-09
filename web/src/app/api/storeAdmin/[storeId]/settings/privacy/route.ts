import { mongoClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";

//NOTE - update privacy policy of the store
export async function PATCH(
  req: Request,
  { params }: { params: { storeId: string } },
) {
  try {
    CheckStoreAdminApiAccess(params.storeId);

    const body = await req.json();

    //const { privacyPolicy,tos } = body;

    const storeSettings = await mongoClient.storeSettings.upsert({
      where: {
        databaseId: params.storeId,
      },
      update: { ...body, updatedAt: new Date(Date.now()) },
      create: {
        ...body,
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
