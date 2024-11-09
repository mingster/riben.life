import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import type { StoreOrder } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

// get all orders in the given orderId array
export async function POST(
  req: Request,
  { params }: { params: { storeId: string } },
) {
  try {

    const body = await req.json();
    const { orderIds } = body;

    //console.log("get-orders", orderIds);

    if (orderIds) {
      const orders = (await sqlClient.storeOrder.findMany({
        where: {
          id: {
            in: orderIds,
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
      transformDecimalsToNumbers(orders);

      //revalidatePath("/order");
      return NextResponse.json(orders);
    }

    //console.log(`updated user: ${JSON.stringify(obj)}`);

    return NextResponse.json([]);

  } catch (error) {
    console.log("[POST]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
