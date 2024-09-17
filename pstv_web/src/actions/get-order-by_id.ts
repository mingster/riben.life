import { sqlClient } from "@/lib/prismadb";
import type { StoreOrder } from "@/types";

const getOrderById = async (orderId: string): Promise<StoreOrder | null> => {
  if (!orderId) {
    throw Error("orderId is required");
  }

  const obj = await sqlClient.storeOrder.findUnique({
    where: {
      id: orderId,
    },
    /*
        select: {
          isPaid: true,
          orderTotal: true,
          shippingMethod: true,
          paymentMethod: true,
        },
        */
    include: {
      OrderNotes: true,
      OrderItemView: true,
      User: true,
      ShippingMethod: true,
      PaymentMethod: true,
    },
  });

  return obj;
};

export default getOrderById;
