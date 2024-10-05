import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckStoreAdminAccess } from "../../api_helper";
import { transformDecimalsToNumbers } from "@/lib/utils";
import { IsSignInResponse } from "@/lib/auth/utils";

///!SECTION create new SubscriptionPayment.
export async function POST(
  req: Request,
  { params }: { params: { storeId: string } },
) {
  try {
    CheckStoreAdminAccess(params.storeId);
    const userId = await IsSignInResponse();
    if (typeof userId !== "string") {
      return new NextResponse("Unauthenticated", { status: 400 });
    }

    const result = await sqlClient.subscriptionPayment.create({
      data: {
        storeId: params.storeId,
        userId: userId,
        isPaid: false,
        amount: 300,
        currency: "twd",
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.log("[SubscriptionPayment_POST]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
