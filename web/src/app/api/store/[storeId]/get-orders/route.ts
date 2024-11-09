import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import type { StoreOrder } from "@/types";
import { NextResponse } from "next/server";

// get all orders in the given orderId array
export async function GET(
  req: Request,
  { params }: { params: { storeId: string } },
) {
  try {

    const body = await req.json();
    const { orderIds } = body;

    const orders: StoreOrder[] = [];

    console.log("get-orders", orderIds);

    /*
    if (orderIds) {
      orderIds.map(async (orderId: string) => {
        if (orderId) {
          console.log("get-orders", orderId);
          const order = await sqlClient.storeOrder.findUnique({
            where: {
              id: orderId,
            },
          }) as StoreOrder;

          transformDecimalsToNumbers(order);
          orders.push(order);
        }

      });
    }
      */

    //revalidatePath("/order");
    //console.log(`updated user: ${JSON.stringify(obj)}`);

    return NextResponse.json(orders);
  } catch (error) {
    console.log("[PATCH]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
