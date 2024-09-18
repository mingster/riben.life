import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckStoreAdminAccess } from "../../../api_helper";
import { transformDecimalsToNumbers } from "@/lib/utils";

//delete storetable by its id
export async function DELETE(
  req: Request,
  { params }: { params: { storeId: string; tableId: string } },
) {
  //try {
  CheckStoreAdminAccess(params.storeId);

  if (!params.tableId) {
    return new NextResponse("table id is required", { status: 400 });
  }

  // TO-DO: only archive the product if there's order already placed.

  const obj = await sqlClient.storeTables.delete({
    where: {
      id: params.tableId,
    },
  });

  console.log("[STORE_TABLE_DELETED]", obj);

  return NextResponse.json(obj);
  /*} catch (error) {
    console.log("[PRODUCT_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }*/
}

///!SECTION update tableId in database.
export async function PATCH(
  req: Request,
  { params }: { params: { storeId: string; tableId: string } },
) {
  try {
    CheckStoreAdminAccess(params.storeId);

    if (!params.tableId) {
      return new NextResponse("table id is required", { status: 400 });
    }

    const body = await req.json();

    const { tableName } = body;

    if (!tableName) {
      return new NextResponse("Name is required", { status: 400 });
    }

    const obj = await sqlClient.storeTables.update({
      where: {
        id: params.tableId,
      },
      data: {
        ...body,
      },
    });

    return NextResponse.json(obj);
  } catch (error) {
    console.log("[STORE_TABLE_PATCH]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
