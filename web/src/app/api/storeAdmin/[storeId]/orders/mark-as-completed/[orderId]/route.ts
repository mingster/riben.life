import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { sqlClient } from "@/lib/prismadb";
import { OrderStatus } from "@/types/enum";
import { NextResponse } from "next/server";

///!SECTION mark pending or processing order as completed
export async function POST(
  req: Request,
  { params }: { params: { storeId: string; orderId: string } },
) {
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

    /*
    const ship = await sqlClient.shippingMethod.findUnique({
      where: {
        id: orderToUpdate.shippingMethodId,
      },
    });

    // if physical shipping NOT required, mark order status as completed
    if (ship?.shipRequried) {
      await sqlClient.storeOrder.update({
        where: {
          id: params.orderId,
        },
        data: {
          orderStatus: OrderStatus.Completed,
        },
      });
    } else {
      await sqlClient.storeOrder.update({
        where: {
          id: params.orderId,
        },
        data: {
          orderStatus: OrderStatus.InShipping,
        },
      });
    }
*/

    await sqlClient.storeOrder.update({
      where: {
        id: params.orderId,
      },
      data: {
        orderStatus: OrderStatus.Completed,
        updatedAt: new Date(Date.now()),
      },
    });

    return NextResponse.json("success", { status: 200 });
  } catch (error) {
    console.log("[ORDER_MARK_AS_COMPLETED]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
