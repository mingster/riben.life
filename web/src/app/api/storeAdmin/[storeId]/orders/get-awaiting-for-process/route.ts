import { sqlClient } from "@/lib/prismadb";
import { OrderStatus } from "@/types/enum";
import type { StoreOrder } from "@prisma/client";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import { transformDecimalsToNumbers } from "@/lib/utils";

// get pending and processing orders in the store.
export async function GET(
  req: Request,
  { params }: { params: { storeId: string } },
) {
  try {
    CheckStoreAdminApiAccess(params.storeId);

    const store = await sqlClient.store.findUnique({
      where: {
        id: params.storeId,
      },
    });

    if (!store) {
      return new NextResponse("store not found", { status: 404 });
    }

    // if auto accept order, filter by both pending and processing; else filter by pending
    const filter = store.autoAcceptOrder
      ? {
          orderStatus: {
            in: [
              OrderStatus.Pending,
              OrderStatus.Processing,
              //OrderStatus.InShipping,
            ],
          },
        }
      : {
          orderStatus: {
            in: [OrderStatus.Processing],
          },
        };

    const awaiting4ProcessOrders = (await sqlClient.storeOrder.findMany({
      where: {
        storeId: params.storeId,
        ...filter,
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

    //console.log("awaiting4ProcessOrders", JSON.stringify(awaiting4ProcessOrders));
    return NextResponse.json(awaiting4ProcessOrders);
  } catch (error) {
    console.error("[GET_PENDING_ORDERS]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
