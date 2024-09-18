import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckStoreAdminAccess } from "../../api_helper";
import { transformDecimalsToNumbers } from "@/lib/utils";

///!SECTION create new product.
export async function POST(
  req: Request,
  { params }: { params: { storeId: string } },
) {
  try {
    CheckStoreAdminAccess(params.storeId);

    const body = await req.json();
    const { prefix, numOfTables, capacity } = body;

    for (let i = 1; i < numOfTables + 1; i++) {
      await sqlClient.storeTables.create({
        data: {
          storeId: params.storeId,
          tableName: `${prefix}${i}`,
          capacity,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("[TABLES_POST]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
