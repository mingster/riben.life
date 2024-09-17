import checkStoreAdminAccess from "@/actions/storeAdmin/check-store-access";
import { CheckStoreAdminAccess } from "@/app/api/storeAdmin/api_helper";
import { authOptions } from "@/auth";
import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import { ProductAttribute } from "@prisma/client";
import { type Session, getServerSession } from "next-auth";
import { NextResponse } from "next/server";

///!SECTION update product attribute in database.
export async function PATCH(
  req: Request,
  { params }: { params: { storeId: string; productId: string } },
) {
  try {
    CheckStoreAdminAccess(params.storeId);

    if (!params.productId) {
      return new NextResponse("product id is required", { status: 400 });
    }

    const body = await req.json();
    const obj = await sqlClient.productAttribute.update({
      where: {
        productId: params.productId,
      },
      data: { ...body },
    });

    //console.log(`updated product attribute: ${JSON.stringify(obj)}`);
    transformDecimalsToNumbers(obj);

    return NextResponse.json(obj);
  } catch (error) {
    console.log("[PRODUCT_ATTRIBUTE_PATCH]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
