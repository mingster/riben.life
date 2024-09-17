import checkStoreAdminAccess from "@/actions/storeAdmin/check-store-access";
import { CheckStoreAdminAccess } from "@/app/api/storeAdmin/api_helper";
import { authOptions } from "@/auth";
import { sqlClient } from "@/lib/prismadb";
import { type Session, getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: { storeId: string; productId: string } },
) {
  CheckStoreAdminAccess(params.storeId);

  const body = await req.json();

  await sqlClient.productCategories.create({
    data: { ...body },
  });

  return NextResponse.json("success", { status: 200 });
}

export async function DELETE(
  req: Request,
  { params }: { params: { storeId: string; productId: string } },
) {
  CheckStoreAdminAccess(params.storeId);

  const body = await req.json();
  const { categoriesToRemove } = body;

  //console.log(`categoriesToRemove: ${categoriesToRemove}`);

  await sqlClient.productCategories.deleteMany({
    where: {
      /*
      categoryId: {
        contains: categoriesToRemove,
      },*/
      productId: params.productId,
    },
  });

  return NextResponse.json("success", { status: 200 });
}
