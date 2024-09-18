import checkStoreAdminAccess from "@/actions/storeAdmin/check-store-access";
import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckStoreAdminAccess } from "../../../api_helper";

///!SECTION update Category record in database.
export async function PATCH(
  req: Request,
  { params }: { params: { storeId: string; categoryId: string } },
) {
  try {
    CheckStoreAdminAccess(params.storeId);

    if (!params.categoryId) {
      return new NextResponse("category id is required", { status: 401 });
    }

    const body = await req.json();
    const obj = await sqlClient.category.update({
      where: {
        id: params.categoryId,
      },
      data: { ...body },
    });

    console.log(`update Category: ${JSON.stringify(obj)}`);

    return NextResponse.json(obj);
  } catch (error) {
    console.log("[CATEGORY_PATCH]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}

///!SECTION delete Category record in database.
export async function DELETE(
  req: Request,
  { params }: { params: { storeId: string; categoryId: string } },
) {
  //try {
  CheckStoreAdminAccess(params.storeId);

  if (!params.categoryId) {
    return new NextResponse("category id is required", { status: 401 });
  }

  const obj = await sqlClient.category.delete({
    where: {
      id: params.categoryId,
    },
  });

  console.log(`delete Category: ${JSON.stringify(obj)}`);

  return NextResponse.json(obj);
  /*} catch (error) {
    console.log("[CATEGORY_DELETE]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }*/
}
