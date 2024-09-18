
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
    const {
      name,
      description,
      price,
      currency,
      isFeatured,
      status,
      ProductAttribute,
    } = body;

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    const product = await sqlClient.product.create({
      data: {
        storeId: params.storeId,
        name,
        description,
        price,
        currency,
        isFeatured,
        status,
        updatedAt: new Date(Date.now()),
        ProductAttribute: {
          create: { ...ProductAttribute },
        },
      },
    });

    transformDecimalsToNumbers(product);

    //console.log(`create product: ${JSON.stringify(product)}`);

    return NextResponse.json(product);
  } catch (error) {
    console.log("[PRODUCT_POST]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}

// get products in the store
export async function GET(
  req: Request,
  { params }: { params: { storeId: string } },
) {
  try {
    CheckStoreAdminAccess(params.storeId);

    const { searchParams } = new URL(req.url);
    //const categoryId = searchParams.get('categoryId') || undefined;
    const isFeatured = searchParams.get("isFeatured");

    if (!params.storeId) {
      return new NextResponse("Store id is required", { status: 400 });
    }

    const products = await sqlClient.product.findMany({
      where: {
        storeId: params.storeId,
        isFeatured: isFeatured ? true : undefined,
      },
      include: {
        //images: true,
        //category: true,
        //productPrices: true,
        ProductAttribute: true,
        //productSpec: { include: { options: true } },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    transformDecimalsToNumbers(products);

    return NextResponse.json(products);
  } catch (error) {
    console.log("[PRODUCT_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
