import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import { transformDecimalsToNumbers } from "@/lib/utils";
import { OrderStatus } from "@/types/enum";
import type { StoreOrder } from "@/types";
import getOrderById from "@/actions/get-order-by_id";

// mark order as deleted
export async function DELETE(
  req: Request,
  props: { params: Promise<{ orderId: string; storeId: string }> },
) {
  const params = await props.params;
  //try {
  CheckStoreAdminApiAccess(params.storeId);

  if (!params.orderId) {
    return new NextResponse("orderId is required", { status: 400 });
  }

  const order = await sqlClient.storeOrder.update({
    where: {
      id: params.orderId,
    },
    data: {
      orderStatus: OrderStatus.Voided,
    },
  });

  if (Number(order.orderTotal) === 0) {
    const order = await sqlClient.storeOrder.delete({
      where: {
        id: params.orderId,
      },
    });
  }

  console.log("[ORDER_DELETED]", order);

  return NextResponse.json(order);
  /*} catch (error) {
    console.log("[PRODUCT_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }*/
}

/// persist updated order in database
export async function PATCH(
  req: Request,
  props: { params: Promise<{ storeId: string; orderId: string }> },
) {
  const params = await props.params;
  try {
    CheckStoreAdminApiAccess(params.storeId);

    if (!params.orderId) {
      return new NextResponse("orderId is required", { status: 400 });
    }

    const updatedOrder = (await req.json()) as StoreOrder;

    await sqlClient.storeOrder.update({
      where: {
        id: params.orderId,
      },
      data: {
        paymentMethodId: updatedOrder.paymentMethodId,
        shippingMethodId: updatedOrder.shippingMethodId,
        tableId: updatedOrder.tableId,
        orderTotal: updatedOrder.orderTotal,
      },
    });

    await sqlClient.orderItem.deleteMany({
      where: {
        orderId: params.orderId,
      },
    });

    updatedOrder.OrderItemView.map(async (item) => {
      await sqlClient.orderItem.create({
        data: {
          orderId: params.orderId,
          productId: item.productId,
          productName: item.name || "",
          variants: item.variants, // hold values of product options selection delimited by comma
          variantCosts: item.variantCosts,
          quantity: item.quantity || 1,
          unitDiscount: item.unitDiscount || 0,
          unitPrice: item.unitPrice || 0,
        },
      });
    });

    const result = await getOrderById(params.orderId);

    return NextResponse.json(result);
  } catch (error) {
    console.log("[ORDER_PATCH]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
