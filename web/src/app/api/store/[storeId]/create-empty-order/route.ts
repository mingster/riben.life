import { sqlClient } from "@/lib/prismadb";
import {
	getNowTimeInTz,
	getUtcNow,
	transformDecimalsToNumbers,
} from "@/utils/utils";
import { OrderStatus, PaymentStatus } from "@/types/enum";
import { Prisma, StoreShipMethodMapping } from "@prisma/client";
import { NextResponse } from "next/server";

//create an new empty order
//
export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	if (!params.storeId) {
		return new NextResponse("storeId is required", { status: 400 });
	}
	//console.log('storeId: ' + params.storeId);

	const data = await req.json();
	//console.log('data: ' + JSON.stringify(data));

	// those are minimum required fields
	// productIds, quantities,unitPrices are array that must match in length;
	// orderNote is array of string.
	const {
		userId,
		tableId, //can be null
		total,
		currency,
		productIds,
		quantities,
		unitPrices,
		variants, //can be null
		variantCosts, //can be null
		orderNote, //can be null
		shippingMethodId,
		paymentMethodId,
	} = data;

	//console.log('data', JSON.stringify(data));

	// #region data check
	/*
  if (!userId) {
    return NextResponse.json(
      { success: false, message: "userId is required." },
      { status: 401 },
    );
  }


  if (!shippingMethodId) {
    return NextResponse.json(
      { success: false, message: "shippingMethodId is required." },
      { status: 409 },
    );
  }

*/

	// #engregion

	const products = await sqlClient.product.findMany({
		where: {
			id: {
				in: productIds,
			},
		},
	});

	if (!products) {
		return NextResponse.json(
			{ success: false, message: "no product found." },
			{ status: 409 },
		);
	}

	//console.log('data: ' + JSON.stringify(data));

	const store = await sqlClient.store.findUnique({
		where: {
			id: params.storeId,
		},
	});

	if (!store) {
		return NextResponse.json(
			{ success: false, message: "store not found." },
			{ status: 409 },
		);
	}

	// store time in store's local timezone
	const storeTimeNow = getNowTimeInTz(store.defaultTimezone);

	const orderStatus = store?.autoAcceptOrder
		? OrderStatus.Processing
		: OrderStatus.Pending;

	const result = await sqlClient.storeOrder.create({
		data: {
			storeId: params.storeId,
			userId: userId || null, //user is optional
			tableId: tableId || "", // empty string so zod won't throw error
			isPaid: false,
			orderTotal: new Prisma.Decimal(total),
			currency: currency,
			paymentMethodId: paymentMethodId,
			shippingMethodId: shippingMethodId,
			createdAt: storeTimeNow,
			updatedAt: storeTimeNow,
			paymentStatus: PaymentStatus.Pending,
			orderStatus: orderStatus,
			OrderItems: {
				createMany: {
					data: products.map((product, index: number) => ({
						productId: product.id,
						productName: product.name,
						variants: variants[index] || null,
						variantCosts: variantCosts[index] || null,
						quantity: quantities[index],
						unitPrice: unitPrices[index],
					})),
				},
			},
			OrderNotes: {
				/*
        createMany: {
          data: orderNote.map((note: string) => ({
            note: note,
            displayToCustomer: true,
          })),
        },
        */
				create: {
					note: orderNote,
					displayToCustomer: true,
				},
			},
		},
	});

	const order = await sqlClient.storeOrder.findUnique({
		where: {
			id: result.id,
		},
		include: {
			Store: true,
			OrderNotes: true,
			OrderItemView: true,
			User: true,
			ShippingMethod: true,
			PaymentMethod: true,
		},
	});
	transformDecimalsToNumbers(order);

	//console.log('order: ' + JSON.stringify(order));
	return NextResponse.json({ order });
}
