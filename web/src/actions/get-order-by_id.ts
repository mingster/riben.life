import { sqlClient } from "@/lib/prismadb";
import type { StoreOrder } from "@/types";
import { transformDecimalsToNumbers } from "@/utils/utils";
import type { StoreTables } from "@prisma/client";

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
			Store: true,
			OrderNotes: true,
			OrderItemView: true,
			User: true,
			ShippingMethod: true,
			PaymentMethod: true,
		},
	});

	transformDecimalsToNumbers(obj);

	/*
  if (
    obj?.tableId &&
    obj?.tableId !== null &&
    obj?.tableId !== undefined &&
    obj?.tableId !== ""
  ) {
    // mock tableId to its display name
    const table = (await sqlClient.storeTables.findUnique({
      where: {
        id: obj?.tableId,
      },
    })) as StoreTables;

    if (table) obj.tableId = table.tableName;
    //console.log(obj.tableId);
  }
  */

	return obj;
};

export default getOrderById;
