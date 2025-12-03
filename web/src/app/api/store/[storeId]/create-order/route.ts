import { sqlClient } from "@/lib/prismadb";
import { OrderStatus, PaymentStatus } from "@/types/enum";
import { getRandomNum, transformPrismaDataForJson } from "@/utils/utils";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

//create an pending order
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
		facilityId, //can be null
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

	//console.log('data: ' + productIds + userId, orderTotal);

	// #region data check
	/*
  if (!userId) {
    return NextResponse.json(
      { success: false, message: "userId is required." },
      { status: 401 },
    );
  }
*/

	if (!total) {
		return NextResponse.json(
			{ success: false, message: "orderTotal is required." },
			{ status: 402 },
		);
	}

	if (!Array.isArray(productIds)) {
		return NextResponse.json(
			{ success: false, message: "value is not an array." },
			{ status: 403 },
		);
	}

	if (!Array.isArray(quantities)) {
		return NextResponse.json(
			{ success: false, message: "value is not an array." },
			{ status: 404 },
		);
	}

	if (!Array.isArray(unitPrices)) {
		return NextResponse.json(
			{ success: false, message: "value is not an array." },
			{ status: 405 },
		);
	}

	/*
  if (!Array.isArray(orderNote)) {
    return NextResponse.json(
      { success: false, message: "value is not an array." },
      { status: 406 },
    );
  }
  */

	if (productIds.length !== quantities.length) {
		return NextResponse.json(
			{ success: false, message: "productIds and quantities must match." },
			{ status: 407 },
		);
	}
	if (productIds.length !== unitPrices.length) {
		return NextResponse.json(
			{ success: false, message: "productIds and unitPrices must match." },
			{ status: 408 },
		);
	}

	if (!shippingMethodId) {
		return NextResponse.json(
			{ success: false, message: "shippingMethodId is required." },
			{ status: 409 },
		);
	}

	if (!paymentMethodId) {
		return NextResponse.json(
			{ success: false, message: "paymentMethodId is required." },
			{ status: 410 },
		);
	}
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

	// Use UTC for timestamps
	const now = getUtcNowEpoch();

	const orderStatus = store?.autoAcceptOrder
		? OrderStatus.Processing
		: OrderStatus.Pending;

	// shipping method

	const result = await sqlClient.storeOrder.create({
		data: {
			storeId: params.storeId,
			userId: userId || null, //user is optional
			facilityId: facilityId || null,
			isPaid: false,
			orderTotal: new Prisma.Decimal(total),
			currency: currency,
			paymentMethodId: paymentMethodId,
			shippingMethodId: shippingMethodId,
			pickupCode: getRandomNum(6),
			createdAt: now,
			updatedAt: now,
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
					createdAt: getUtcNowEpoch(),
					updatedAt: getUtcNowEpoch(),
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
	transformPrismaDataForJson(order);

	//console.log('order: ' + JSON.stringify(order));
	return NextResponse.json({ order });
}
