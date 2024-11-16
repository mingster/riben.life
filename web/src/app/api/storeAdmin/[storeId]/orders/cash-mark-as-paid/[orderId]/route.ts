import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { sqlClient } from "@/lib/prismadb";
import { getNowTimeInTz, getUtcNow } from "@/lib/utils";
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

    const store = await sqlClient.store.findUnique({
      where: {
        id: params.storeId,
      },
    });

    if (store === null) {
      return new NextResponse("store not found", { status: 500 });
    }

    const cash_paymentMethod = await sqlClient.paymentMethod.findUnique({
      where: {
        name: "cash",
      },
    });

    // mark the order as paid, update payment status, and order status to in-progress
    // all order related date/time is saved in store's local timezone.
    await sqlClient.storeOrder.update({
      where: {
        id: params.orderId,
      },
      data: {
        isPaid: true,
        paidDate: getNowTimeInTz(store.defaultTimezone),
        paymentMethodId: cash_paymentMethod?.id,
        paymentStatus: PaymentStatus.Paid,
        orderStatus: OrderStatus.Processing,
        updatedAt: getNowTimeInTz(store.defaultTimezone),
      },
    });

    return NextResponse.json("success", { status: 200 });
  } catch (error) {
    console.log("[ORDER_MARK_AS_COMPLETED]", error);

    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
