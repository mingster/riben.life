import { mongoClient } from "@/lib/prismadb";
import { getUtcNow } from "@/lib/utils";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";

//NOTE - update privacy policy of the store
export async function PATCH(
  req: Request,
  props: { params: Promise<{ storeId: string }> },
) {
  const params = await props.params;
  try {
    CheckStoreAdminApiAccess(params.storeId);

    const body = await req.json();

    //const { privacyPolicy,tos } = body;

    const storeSettings = await mongoClient.storeSettings.upsert({
      where: {
        databaseId: params.storeId,
      },
      update: { ...body, updatedAt: getUtcNow() },
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
