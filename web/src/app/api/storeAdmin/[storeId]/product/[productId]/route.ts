import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import { transformDecimalsToNumbers } from "@/lib/utils";

//delete product by its id
export async function DELETE(
  req: Request,
  { params }: { params: { productId: string; storeId: string } },
) {
  //try {
  CheckStoreAdminApiAccess(params.storeId);

  if (!params.productId) {
    return new NextResponse("product id is required", { status: 400 });
  }

  // TO-DO: only archive the product if there's order already placed.

  const product = await sqlClient.product.delete({
    where: {
      id: params.productId,
    },
  });

  await sqlClient.productAttribute.deleteMany({
    where: {
      productId: params.productId,
    },
  });
  await sqlClient.productCategories.deleteMany({
    where: {
      productId: params.productId,
    },
  });

  transformDecimalsToNumbers(product);

  console.log("[PRODUCT_DELETED]", product);

  return NextResponse.json(product);
  /*} catch (error) {
    console.log("[PRODUCT_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }*/
}

///!SECTION update product in database.
export async function PATCH(
  req: Request,
  { params }: { params: { storeId: string; productId: string } },
) {
  try {
    CheckStoreAdminApiAccess(params.storeId);

    if (!params.productId) {
      return new NextResponse("product id is required", { status: 400 });
    }

    const body = await req.json();
    const {
      name,
      /*,
      description,
      price,
      currency,
      isFeatured,
      useOption,
      status,
      ProductAttribute,*/
    } = body;

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    const product = await sqlClient.product.update({
      where: {
        id: params.productId,
      },
      data: {
        ...body,
        updatedAt: new Date(Date.now()),
        /*
        ProductAttribute: {
          update: { ...ProductAttribute },
        },*/
      },
    });

    transformDecimalsToNumbers(product);

    //console.log(`updated product: ${JSON.stringify(product)}`);

    return NextResponse.json(product);
  } catch (error) {
    console.log("[PRODUCT_PATCH]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
