
import { mongoClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckStoreAdminAccess } from "../../../api_helper";

//NOTE - update store's contact info
export async function PATCH(
  req: Request,
  { params }: { params: { storeId: string } },
) {
  try {
    CheckStoreAdminAccess(params.storeId);

    const body = await req.json();

    const storeSettings = await mongoClient.storeSettings.upsert({
      where: {
        databaseId: params.storeId,
      },
      update: { ...body, updatedAt: new Date(Date.now()) },
      create: {
        databaseId: params.storeId,
        ...body,
      },
    });

    const { streetLine1 } = body;
    if (streetLine1) {
      const address = await mongoClient.address.upsert({
        where: {
          storeSettingsId: storeSettings.id,
        },
        update: { ...body, updatedAt: new Date(Date.now()) },
        create: {
          storeSettingsId: storeSettings.id,
          ...body,
        },
      });
    }

    //console.log(`storeSettings: ${JSON.stringify(storeSettings)}`);

    return NextResponse.json(storeSettings);
  } catch (error) {
    console.log("[STORE_PATCH]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
