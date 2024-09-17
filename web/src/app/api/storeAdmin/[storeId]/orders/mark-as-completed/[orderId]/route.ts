import checkStoreAdminAccess from "@/actions/storeAdmin/check-store-access";
import { CheckStoreAdminAccess } from "@/app/api/storeAdmin/api_helper";
import { authOptions } from "@/auth";
import { sqlClient } from "@/lib/prismadb";
import { OrderStatus } from "@/types/enum";
import { type Session, getServerSession } from "next-auth";
import { NextResponse } from "next/server";

///!SECTION mark order as completed
export async function POST(
  req: Request,
  { params }: { params: { storeId: string; orderId: string } },
) {
  try {
    CheckStoreAdminAccess(params.storeId);

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

    return NextResponse.json("success", { status: 200 });
  } catch (error) {
    console.log("[ORDER_MARK_AS_COMPLETED]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
