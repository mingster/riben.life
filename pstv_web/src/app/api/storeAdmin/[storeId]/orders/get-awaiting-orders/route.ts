import { sqlClient } from "@/lib/prismadb";
import { OrderStatus } from "@/types/enum";
import type { StoreOrder } from "@prisma/client";
import { NextResponse } from "next/server";
import { CheckStoreAdminAccess } from "../../../api_helper";
import { transformDecimalsToNumbers } from "@/lib/utils";

// returns orders in a store
export async function GET(
  req: Request,
  { params }: { params: { storeId: string } },
) {
  try {
    CheckStoreAdminAccess(params.storeId);

    const awaiting4ProcessOrders = (await sqlClient.storeOrder.findMany({
      where: {
        storeId: params.storeId,
        orderStatus: OrderStatus.Processing,
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

    transformDecimalsToNumbers(awaiting4ProcessOrders);

    return NextResponse.json(awaiting4ProcessOrders);
  } catch (error) {
    console.error("[GET_PENDING_ORDERS]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
