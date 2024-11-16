import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";

///!SECTION create product image in database.
export async function PATCH(
  req: Request,
  props: { params: Promise<{ storeId: string; productId: string }> },
) {
  const params = await props.params;
  try {
    CheckStoreAdminApiAccess(params.storeId);

    if (!params.productId) {
      return new NextResponse("product id is required", { status: 400 });
    }

    const body = await req.json();
    const obj = await sqlClient.productImages.create({
      data: { ...body },
    });

    console.log(`updated product image: ${JSON.stringify(obj)}`);

    return NextResponse.json(obj);
  } catch (error) {
    console.log("[PRODUCT_IMAGE_PATCH]", error);

    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ storeId: string; productId: string }> },
) {
  const params = await props.params;
  try {
    CheckStoreAdminApiAccess(params.storeId);

    if (!params.productId) {
      return new NextResponse("product id is required", { status: 400 });
    }

    const body = await req.json();
    const { id, publicId } = body;
    console.log(`delete product image id: ${id}`);
    console.log(`delete product image pubid: ${publicId}`);

    const obj = await sqlClient.productImages.delete({
      where: {
        //imgPublicId: publicId,
        id: id,
      },
    });

    return NextResponse.json(obj);
  } catch (error) {
    console.log("[PRODUCT_IMAGE_DELETE]", error);

    return new NextResponse("Internal error", { status: 500 });
  }
}
