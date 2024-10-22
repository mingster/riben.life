import { sqlClient } from "@/lib/prismadb";
import { OrderStatus } from "@/types/enum";
import type { StoreOrder } from "@prisma/client";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import { transformDecimalsToNumbers } from "@/lib/utils";

// get unpaid orders in the store.
export async function GET(
  req: Request,
  { params }: { params: { storeId: string } },
) {
  try {
    CheckStoreAdminApiAccess(params.storeId);

    const unpaidOrders = (await sqlClient.storeOrder.findMany({
      where: {
        storeId: params.storeId,
        isPaid: false,
        orderStatus: OrderStatus.Pending || OrderStatus.Processing,
      },
      include: {
        OrderNotes: true,
        OrderItemView: {
          include: {
            Product: true,
          },
        },
        User: true,
        ShippingMethod: true,
        PaymentMethod: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    })) as StoreOrder[];

    transformDecimalsToNumbers(unpaidOrders);

    //console.log("awaiting4ProcessOrders", JSON.stringify(awaiting4ProcessOrders));
    return NextResponse.json(unpaidOrders);
  } catch (error) {
    console.error("[GET_UNPAID_ORDERS]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
