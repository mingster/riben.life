import checkStoreAdminAccess from "@/actions/storeAdmin/check-store-access";
import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../api_helper";
import { getUtcNow } from "@/lib/utils";

///!SECTION create Category record in database.
export async function POST(
  req: Request,
  props: { params: Promise<{ storeId: string }> },
) {
  const params = await props.params;
  try {
    CheckStoreAdminApiAccess(params.storeId);

    const body = await req.json();
    if (!body.name) {
      return new NextResponse("name is required", { status: 400 });
    }

    const obj = await sqlClient.category.create({
      data: {
        storeId: params.storeId,
        ...body,
        updatedAt: getUtcNow(),
      },
    });

    //console.log(`create category: ${JSON.stringify(obj)}`);

    return NextResponse.json(obj);
  } catch (error) {
    console.log("[CATEGORY_POST]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}

///!SECTION 批量新增 create multiple Categories record in database.
export async function PATCH(
  req: Request,
  props: { params: Promise<{ storeId: string }> },
) {
  const params = await props.params;
  try {
    CheckStoreAdminApiAccess(params.storeId);

    const body = await req.json();
    const { names, isFeatured } = body;
    if (!names) {
      return new NextResponse("name is required", { status: 400 });
    }

    const name_array = names.split("\n");

    const lastSort = await sqlClient.category.findFirst({
      where: { storeId: params.storeId },
      orderBy: { sortOrder: "desc" },
    });

    const sort = lastSort?.sortOrder ?? 0;

    for (let i = 0; i < name_array.length; i++) {
      const obj = await sqlClient.category.create({
        data: {
          storeId: params.storeId,
          name: name_array[i],
          isFeatured,
          sortOrder: i + sort + 1,
          updatedAt: getUtcNow(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("[CATEGORY_PATCH]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
