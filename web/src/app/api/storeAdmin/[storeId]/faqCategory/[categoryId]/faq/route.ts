import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";

///!SECTION create faq record in database.
export async function POST(
  req: Request,
  { params }: { params: { storeId: string; categoryId: string } },
) {
  try {
    CheckStoreAdminApiAccess(params.storeId);

    if (!params.categoryId) {
      return new NextResponse("faq category id is required", { status: 400 });
    }

    const body = await req.json();
    const obj = await sqlClient.faq.create({
      data: { categoryId: params.categoryId, ...body },
    });

    //console.log(`create Faq: ${JSON.stringify(obj)}`);

    return NextResponse.json(obj);
  } catch (error) {
    console.log("[FAQ_POST]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
