import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../api_helper";

///!SECTION create faqCategory record in database.
export async function POST(
  req: Request,
  { params }: { params: { storeId: string } },
) {
  try {
    CheckStoreAdminApiAccess(params.storeId);

    const body = await req.json();
    const obj = await sqlClient.faqCategory.create({
      data: {
        storeId: params.storeId,
        ...body,
        updatedAt: new Date(Date.now()),
      },
    });

    console.log(`create FaqCategory: ${JSON.stringify(obj)}`);

    return NextResponse.json(obj);
  } catch (error) {
    console.log("[FAQ_CATEGORY_POST]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
