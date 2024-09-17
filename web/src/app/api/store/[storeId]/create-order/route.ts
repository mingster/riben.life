import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import { OrderStatus, PaymentStatus } from "@/types/enum";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

//create an pending order
//
export async function POST(
  req: Request,
  { params }: { params: { storeId: string } },
) {
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
    total,
    currency,
    productIds,
    quantities,
    unitPrices,
    orderNote,
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

  const order = await sqlClient.storeOrder.create({
    data: {
      storeId: params.storeId,
      userId: userId || null, //user is optional
      isPaid: false,
      orderTotal: new Prisma.Decimal(total),
      currency: currency,
      paymentMethodId: paymentMethodId,
      shippingMethodId: shippingMethodId,
      updatedAt: new Date(Date.now()),
      paymentStatus: PaymentStatus.Pending,
      orderStatus: OrderStatus.Pending,
      OrderItems: {
        createMany: {
          data: products.map((product, index: number) => ({
            productId: product.id,
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

  /*
  const order = await prismadb.storeOrder.create({
  data: {
    storeId: params.storeId,
    userId: userId,
    isPaid: false,
    orderTotal: orderTotal,
    currency: data.currency,
    orderItems: {
    createMany: {
      data: products.map((product, index: number) => ({
      productId: product.id,
      quantity: quantities[index],
      unitPrice: prices[index],
      })),
    },
    },
    orderNotes: {
    createMany: {
      data: data.notes.map((note: string) => ({
      note: note,
      displayToCustomer: true,
      })),
    },
    },
    shippingMethodId: shippingMethodId,
    shippingAddress: data.shippingAddress,
    shippingCost: data.shippingCost,
    paymentStatus: Number(PaymentStatus.Pending),
    returnStatus: Number(ReturnStatus.None),
    shippingStatus: Number(ShippingStatus.NotYetShipped),
    orderStatus: Number(OrderStatus.Pending),
    paymentMethodId: data.paymentMethodId,
    checkoutAttributes: data.checkoutAttributes,
  },
  });
*/
  transformDecimalsToNumbers(order);

  //console.log('order: ' + JSON.stringify(order));
  return NextResponse.json({ order });
}
