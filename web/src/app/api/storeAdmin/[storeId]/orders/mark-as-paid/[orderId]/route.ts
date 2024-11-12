import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { sqlClient } from "@/lib/prismadb";
import { OrderStatus, PaymentStatus } from "@/types/enum";
import { NextResponse } from "next/server";

///!SECTION mark order as paid
export async function POST(
  req: Request,
  props: { params: Promise<{ storeId: string; orderId: string }> },
) {
  const params = await props.params;
  try {
    CheckStoreAdminApiAccess(params.storeId);

    if (!params.orderId) {
      return new NextResponse("orderId is required", { status: 403 });
    }

    const orderToUpdate = await sqlClient.storeOrder.findUnique({
      where: {
        id: params.orderId,
      },
    });
    if (orderToUpdate === null) {
      return new NextResponse("order not found", { status: 500 });
    }

    await sqlClient.storeOrder.update({
      where: {
        id: params.orderId,
      },
      data: {
        isPaid: true,
        paidDate: new Date(Date.now()),
        paymentStatus: PaymentStatus.Paid,
      },
    });

    return NextResponse.json("success", { status: 200 });
  } catch (error) {
    console.log("[ORDER_MARK_AS_COMPLETED]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
