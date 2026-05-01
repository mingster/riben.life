import { processCreditTopUpAfterPaymentAction } from "@/actions/store/credit/process-credit-topup-after-payment";
import { isCreditRefillOrder } from "@/actions/store/order/detect-order-type";
import { sqlClient } from "@/lib/prismadb";
import { OrderStatus, PaymentStatus, ProductStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

interface Phase1CreditTopupRequest {
	storeId: string;
	userId: string;
	topUpAmount?: number;
}

export async function POST(req: NextRequest) {
	if (process.env.NODE_ENV === "production") {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const body = (await req.json()) as Phase1CreditTopupRequest;
	const { storeId, userId } = body;
	const topUpAmount = Number(body.topUpAmount ?? 5000);

	if (
		!storeId ||
		!userId ||
		!Number.isFinite(topUpAmount) ||
		topUpAmount <= 0
	) {
		return NextResponse.json(
			{ error: "storeId, userId, and positive topUpAmount are required" },
			{ status: 400 },
		);
	}

	const store = await sqlClient.store.findUnique({
		where: { id: storeId },
		select: { id: true, defaultCurrency: true },
	});
	if (!store) {
		return NextResponse.json({ error: "Store not found" }, { status: 404 });
	}

	const paymentMethod = await sqlClient.paymentMethod.findFirst({
		where: { isDeleted: false },
		orderBy: { createdAt: "asc" },
	});
	if (!paymentMethod) {
		return NextResponse.json(
			{ error: "No payment method found" },
			{ status: 500 },
		);
	}

	const shippingMethod = await sqlClient.shippingMethod.findFirst({
		where: { isDeleted: false },
		orderBy: { createdAt: "asc" },
	});
	if (!shippingMethod) {
		return NextResponse.json(
			{ error: "No shipping method found" },
			{ status: 500 },
		);
	}

	await sqlClient.store.update({
		where: { id: storeId },
		data: {
			useCustomerCredit: true,
			creditExchangeRate: new Prisma.Decimal(1),
			updatedAt: getUtcNowEpoch(),
		},
	});

	const beforeCredit = await sqlClient.customerCredit.findUnique({
		where: { userId },
		select: { point: true },
	});
	const beforePoint = Number(beforeCredit?.point ?? 0);

	const now = getUtcNowEpoch();
	const product = await sqlClient.product.create({
		data: {
			storeId,
			name: `E2E Tennis Lesson 10 classes ${Date.now()}`,
			description: "E2E service package product",
			price: new Prisma.Decimal(topUpAmount),
			currency: store.defaultCurrency,
			status: ProductStatus.Published,
			isFeatured: false,
			canDelete: true,
			useOption: false,
			createdAt: now,
			updatedAt: now,
			ProductAttribute: {
				create: {
					isCreditTopUp: true,
				},
			},
		},
	});

	const order = await sqlClient.storeOrder.create({
		data: {
			storeId,
			userId,
			isPaid: false,
			orderTotal: new Prisma.Decimal(topUpAmount),
			currency: store.defaultCurrency,
			paymentMethodId: paymentMethod.id,
			shippingMethodId: shippingMethod.id,
			paymentStatus: PaymentStatus.Pending,
			orderStatus: OrderStatus.Pending,
			createdAt: now,
			updatedAt: now,
			OrderItems: {
				create: {
					productId: product.id,
					productName: product.name,
					quantity: 1,
					unitPrice: new Prisma.Decimal(topUpAmount),
				},
			},
		},
	});

	const orderForDetection = await sqlClient.storeOrder.findUnique({
		where: { id: order.id },
		include: {
			OrderItemView: {
				select: {
					id: true,
					productId: true,
					name: true,
				},
			},
		},
	});

	if (!orderForDetection) {
		return NextResponse.json(
			{ error: "Failed to load order for detection" },
			{ status: 500 },
		);
	}

	const detectedAsCreditRefill = await isCreditRefillOrder({
		id: orderForDetection.id,
		storeId,
		checkoutAttributes: orderForDetection.checkoutAttributes,
		OrderItemView: orderForDetection.OrderItemView,
	});

	if (!detectedAsCreditRefill) {
		return NextResponse.json(
			{
				error: "Order was not detected as credit refill",
				orderId: order.id,
				productId: product.id,
			},
			{ status: 500 },
		);
	}

	const processResult = await processCreditTopUpAfterPaymentAction({
		orderId: order.id,
	});

	if (processResult?.serverError) {
		return NextResponse.json(
			{
				error: "Credit top-up processing failed",
				details: processResult.serverError,
				orderId: order.id,
			},
			{ status: 500 },
		);
	}

	const afterCredit = await sqlClient.customerCredit.findUnique({
		where: { userId },
		select: { point: true },
	});
	const afterPoint = Number(afterCredit?.point ?? 0);

	return NextResponse.json({
		storeId,
		userId,
		orderId: order.id,
		productId: product.id,
		productName: product.name,
		detectedAsCreditRefill,
		beforePoint,
		afterPoint,
		pointDelta: afterPoint - beforePoint,
		expectedDelta: topUpAmount,
	});
}
