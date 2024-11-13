import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { sqlClient } from "@/lib/prismadb";
import { OrderStatus, PaymentStatus } from "@/types/enum";
import { NextResponse } from "next/server";
import { getNowDateInTz, getUtcDate } from "@/lib/utils";

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

    const store = await sqlClient.store.findUnique({
      where: {
        id: params.storeId,
      },
    });

    if (store === null) {
      return new NextResponse("store not found", { status: 500 });
    }

    await sqlClient.storeOrder.update({
      where: {
        id: params.orderId,
      },
      data: {
        isPaid: true,
        paidDate: getNowDateInTz(store.defaultTimezone),
        paymentStatus: PaymentStatus.Paid,
      },
    });

    return NextResponse.json("success", { status: 200 });
  } catch (error) {
    console.log("[ORDER_MARK_AS_COMPLETED]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
