import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../api_helper";
import { transformDecimalsToNumbers } from "@/lib/utils";
import getStoreTables from "@/actions/get-store-tables";
import type { StoreTables } from "@prisma/client";

///!SECTION create new store table.
export async function POST(
  req: Request,
  { params }: { params: { storeId: string } },
) {
  try {
    CheckStoreAdminApiAccess(params.storeId);

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

export async function GET(
  req: Request,
  { params }: { params: { storeId: string } },
) {
  CheckStoreAdminApiAccess(params.storeId);

  const tables = await sqlClient.storeTables.findMany({
    where: {
      storeId: params.storeId,
    },
    orderBy: {
      tableName: "asc",
    },
  });

  return NextResponse.json(tables);
}
