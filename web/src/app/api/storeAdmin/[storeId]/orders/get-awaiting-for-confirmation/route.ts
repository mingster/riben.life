import { sqlClient } from "@/lib/prismadb";
import { OrderStatus } from "@/types/enum";
import type { StoreOrder } from "@prisma/client";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import { transformDecimalsToNumbers } from "@/lib/utils";

// get pending orders in the store.
export async function GET(
  req: Request,
  props: { params: Promise<{ storeId: string }> },
) {
  const params = await props.params;
  try {
    CheckStoreAdminApiAccess(params.storeId);

    const awaitingOrders = (await sqlClient.storeOrder.findMany({
      where: {
        storeId: params.storeId,
        orderStatus: {
          in: [OrderStatus.Pending],
        },
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

    transformDecimalsToNumbers(awaitingOrders);

    //console.log("awaitingOrders", JSON.stringify(awaitingOrders));

    return NextResponse.json(awaitingOrders);
  } catch (error) {
    console.error("[GET_PENDING_ORDERS]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
