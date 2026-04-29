import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { parseBagCustomizationPayload } from "@/actions/product/customize-product.validation";
import { auth } from "@/lib/auth";
import { estimateCustomizationPrice } from "@/lib/customization-utils";
import { getLinePayClientByStore } from "@/lib/payment/linePay";
import { getNewebPayCredentialsByStore } from "@/lib/payment/newebpay";
import logger from "@/lib/logger";
import {
	normalizePayUrl,
	resolveShopCheckoutPayment,
} from "@/lib/payment/resolve-shop-checkout-payment";
import {
	createPayPalOrder,
	formatPayPalAmountValue,
	getPayPalCredentialsByStore,
} from "@/lib/payment/paypal";
import { sqlClient } from "@/lib/prismadb";
import { toLinePayCurrency } from "@/lib/shop/line-pay-currency";
import {
	computeUnitPriceFromMergedSelections,
	formatOptionSelectionSummary,
	mergeOptionSelections,
} from "@/lib/shop/option-selections";
import {
	serializeAddressSnapshot,
	serializeInlineShippingSnapshot,
} from "@/lib/shop/order-shipping";
import { resolveShippingMethodIdForStore } from "@/lib/shop/shipping-method";
import {
	findStorefrontPickupLocation,
	parseStorefrontPickupLocationsJson,
	quoteStorefrontShipping,
	serializePickupSnapshot,
} from "@/lib/shop/storefront-fulfillment";
import { majorUnitsToStripeUnit } from "@/lib/payment/stripe/stripe-money";
import {
	getShopFacilityIdForStoreOrder,
	getShopStoreIdForApi,
} from "@/lib/shop-store-context";
import { stripe } from "@/lib/payment/stripe/config";
import { OrderStatus, PaymentStatus, ShippingStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

const inlineShippingSchema = z.object({
	firstName: z.string().min(1),
	lastName: z.string().min(1),
	streetLine1: z.string().min(1),
	city: z.string().min(1),
	province: z.string().optional(),
	postalCode: z.string().optional(),
	countryId: z.string().min(2).max(3),
	phoneNumber: z.string().min(1),
});

const bodySchema = z
	.object({
		storeId: z.string().uuid(),
		paymentMethod: z.string().min(1).default("stripe"),
		fulfillmentType: z.enum(["ship", "pickup"]).default("ship"),
		pickupLocationId: z.string().min(1).optional(),
		shippingAddressId: z.string().uuid().optional(),
		shippingAddressInline: inlineShippingSchema.optional(),
		items: z
			.array(
				z.object({
					productId: z.string().uuid(),
					quantity: z.coerce.number().int().min(1).max(99),
					unitPrice: z.number().nonnegative().optional(),
					name: z.string().min(1).optional(),
					customizationData: z.string().max(100_000).optional(),
					optionSelections: z
						.array(
							z.object({
								optionId: z.string().uuid(),
								selectionIds: z.array(z.string().uuid()).min(1).max(40),
							}),
						)
						.optional(),
				}),
			)
			.min(1)
			.max(50),
	})
	.superRefine((data, ctx) => {
		if (data.fulfillmentType === "pickup") {
			if (!data.pickupLocationId || data.pickupLocationId.trim() === "") {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Select a pickup location",
					path: ["pickupLocationId"],
				});
			}
			return;
		}
		if (!data.shippingAddressId && !data.shippingAddressInline) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Shipping address is required",
				path: ["shippingAddressId"],
			});
		}
		if (data.shippingAddressId && data.shippingAddressInline) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Use either a saved address or inline address, not both",
				path: ["shippingAddressInline"],
			});
		}
	});

function moneyClose(a: number, b: number): boolean {
	return Math.abs(a - b) < 0.02;
}

function appOrigin(req: Request): string {
	const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
	if (env) {
		return env;
	}
	const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
	const proto = req.headers.get("x-forwarded-proto") ?? "http";
	if (host) {
		return `${proto}://${host}`;
	}
	return "http://localhost:3001";
}

export async function POST(req: Request) {
	try {
		const session = await auth.api.getSession({ headers: await headers() });
		if (!session?.user?.id) {
			return NextResponse.json({ error: "Sign in required" }, { status: 401 });
		}

		const json: unknown = await req.json();
		const parsed = bodySchema.safeParse(json);
		if (!parsed.success) {
			return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
		}

		const { paymentMethod: paymentMethodRaw, storeId: bodyStoreId } =
			parsed.data;

		const storeId = await getShopStoreIdForApi(bodyStoreId);
		if (!storeId) {
			return NextResponse.json(
				{
					error:
						"No storefront store. Set NEXT_PUBLIC_DEFAULT_STORE_ID or create a store.",
				},
				{ status: 503 },
			);
		}

		const store = await sqlClient.store.findFirst({
			where: { id: storeId, isDeleted: false },
		});
		if (!store) {
			return NextResponse.json({ error: "Store not found" }, { status: 404 });
		}

		const facilityIdForOrder = await getShopFacilityIdForStoreOrder(storeId);

		const resolved = await resolveShopCheckoutPayment(
			storeId,
			paymentMethodRaw,
		);
		if (!resolved.ok) {
			const status =
				resolved.code === "PLATFORM_DISABLED" ||
				resolved.code === "STORE_NOT_ALLOWED"
					? 403
					: resolved.code === "PLUGIN_NOT_REGISTERED"
						? 503
						: 400;
			return NextResponse.json({ error: resolved.message }, { status });
		}

		const { paymentMethod: catalogPaymentMethod } = resolved;

		const processorId = normalizePayUrl(catalogPaymentMethod.payUrl);

		if (processorId === "stripe" && !process.env.STRIPE_SECRET_KEY) {
			return NextResponse.json(
				{
					error: "Stripe is not configured (missing STRIPE_SECRET_KEY).",
				},
				{ status: 503 },
			);
		}
		if (processorId === "newebpay") {
			const newebPay = await getNewebPayCredentialsByStore(storeId, store);
			if (!newebPay) {
				return NextResponse.json(
					{
						error:
							"NewebPay is not configured (add credentials in store settings or platform env).",
					},
					{ status: 503 },
				);
			}
		}

		const shippingMethodId = await resolveShippingMethodIdForStore(storeId);
		if (!shippingMethodId) {
			return NextResponse.json(
				{ error: "No shipping method configured for this store." },
				{ status: 503 },
			);
		}

		const shipMethod = await sqlClient.shippingMethod.findUnique({
			where: { id: shippingMethodId },
		});
		const baseShippingAmount = shipMethod ? Number(shipMethod.basic_price) : 0;

		const storeSettings = await sqlClient.storeSettings.findUnique({
			where: { storeId },
			select: {
				storefrontFreeShippingMinimum: true,
				storefrontPickupLocationsJson: true,
			},
		});
		const pickupLocations = parseStorefrontPickupLocationsJson(
			storeSettings?.storefrontPickupLocationsJson,
		);

		interface ValidatedLine {
			productId: string;
			name: string;
			quantity: number;
			unit: number;
			customizationData: string | null;
			variants: string | null;
			variantCosts: string | null;
		}

		const lines: ValidatedLine[] = [];
		let currency: string | null = null;

		for (const row of parsed.data.items) {
			const product = await sqlClient.product.findFirst({
				where: { id: row.productId, storeId, status: 1 },
				include: {
					ProductOptions: { include: { ProductOptionSelections: true } },
				},
			});
			if (!product) {
				return NextResponse.json(
					{ error: `Product not available: ${row.productId}` },
					{ status: 400 },
				);
			}

			const productCurrency = product.currency.toLowerCase();
			if (currency === null) {
				currency = productCurrency;
			} else if (productCurrency !== currency) {
				return NextResponse.json(
					{
						error:
							"Mixed currencies in one checkout are not supported. Use one currency per order.",
					},
					{ status: 400 },
				);
			}

			const merged = mergeOptionSelections(product, row.optionSelections);
			const priced = computeUnitPriceFromMergedSelections(product, merged);
			if (priced.error) {
				return NextResponse.json({ error: priced.error }, { status: 400 });
			}
			const { variants, variantCosts } = formatOptionSelectionSummary(
				product,
				merged,
			);

			let unit = priced.unit;
			let customizationData: string | null = null;

			if (row.customizationData && row.customizationData.length > 0) {
				let parsedCust: unknown;
				try {
					parsedCust = JSON.parse(row.customizationData);
				} catch {
					return NextResponse.json(
						{ error: "Invalid customization JSON" },
						{ status: 400 },
					);
				}
				const cust = parseBagCustomizationPayload(parsedCust);
				if (!cust.success) {
					return NextResponse.json(
						{ error: "Invalid customization payload" },
						{ status: 400 },
					);
				}
				unit = estimateCustomizationPrice(unit, cust.data);
				customizationData = JSON.stringify(cust.data);
			} else if (
				row.unitPrice !== undefined &&
				!moneyClose(row.unitPrice, unit)
			) {
				return NextResponse.json(
					{ error: "Price mismatch — refresh and try again." },
					{ status: 400 },
				);
			}

			lines.push({
				productId: product.id,
				name: row.name && row.name.length > 0 ? row.name : product.name,
				quantity: row.quantity,
				unit,
				customizationData,
				variants,
				variantCosts,
			});
		}

		const subtotal = lines.reduce((s, l) => s + l.unit * l.quantity, 0);

		const fulfillmentType = parsed.data.fulfillmentType;
		let shippingSnapshot = "";

		if (fulfillmentType === "pickup") {
			const loc = findStorefrontPickupLocation(
				pickupLocations,
				parsed.data.pickupLocationId ?? "",
			);
			if (!loc) {
				return NextResponse.json(
					{ error: "Invalid or unavailable pickup location." },
					{ status: 400 },
				);
			}
			shippingSnapshot = serializePickupSnapshot(loc);
		} else if (parsed.data.shippingAddressId) {
			const addr = await sqlClient.address.findFirst({
				where: {
					id: parsed.data.shippingAddressId,
					userId: session.user.id,
				},
				include: { Country: true },
			});
			if (!addr) {
				return NextResponse.json(
					{ error: "Invalid or unknown shipping address." },
					{ status: 400 },
				);
			}
			shippingSnapshot = serializeAddressSnapshot(addr);
		} else if (parsed.data.shippingAddressInline) {
			const inline = parsed.data.shippingAddressInline;
			const country = await sqlClient.country.findUnique({
				where: { alpha3: inline.countryId },
			});
			if (!country) {
				return NextResponse.json(
					{ error: "Invalid country for shipping." },
					{ status: 400 },
				);
			}
			shippingSnapshot = serializeInlineShippingSnapshot(inline, country.name);
		}

		const shipQuote = quoteStorefrontShipping({
			fulfillmentType,
			subtotalMajor: subtotal,
			baseShippingMajor: baseShippingAmount,
			freeShippingMinimum: storeSettings?.storefrontFreeShippingMinimum,
		});
		const shippingAmount = shipQuote.shippingMajor;

		const total = subtotal + shippingAmount;
		const now = getUtcNowEpoch();

		const orderCurrency = currency ?? store.defaultCurrency.toLowerCase();
		const lineCurrency = toLinePayCurrency(orderCurrency);

		if (processorId === "linepay" && !lineCurrency) {
			return NextResponse.json(
				{
					error:
						"LINE Pay is only available for USD, JPY, TWD, or THB orders. Choose Stripe or change store currency.",
				},
				{ status: 400 },
			);
		}

		const checkoutAttrs = {
			source: "shop_checkout" as const,
			paymentMethod: processorId,
			fulfillmentType,
			pickupLocationId:
				fulfillmentType === "pickup"
					? (parsed.data.pickupLocationId ?? null)
					: null,
			shippingAddressId: parsed.data.shippingAddressId ?? null,
			freeShippingApplied: shipQuote.freeShippingApplied,
		};

		const order = await sqlClient.$transaction(async (tx) => {
			const o = await tx.storeOrder.create({
				data: {
					storeId,
					userId: session.user.id,
					facilityId: facilityIdForOrder,
					shippingMethodId,
					shippingAddress: shippingSnapshot,
					shippingCost: new Prisma.Decimal(shippingAmount),
					orderTotal: new Prisma.Decimal(total),
					currency: orderCurrency,
					createdAt: now,
					updatedAt: now,
					paymentStatus: PaymentStatus.Pending,
					orderStatus: OrderStatus.Pending,
					shippingStatus: ShippingStatus.NotYetShipped,
					shopFulfillmentType: fulfillmentType,
					shopPickupLocationId:
						fulfillmentType === "pickup"
							? (parsed.data.pickupLocationId ?? null)
							: null,
					checkoutAttributes: JSON.stringify(checkoutAttrs),
					paymentMethodId: catalogPaymentMethod.id,
				},
			});

			for (const line of lines) {
				await tx.orderItem.create({
					data: {
						orderId: o.id,
						productId: line.productId,
						productName: line.name,
						quantity: line.quantity,
						unitPrice: new Prisma.Decimal(line.unit),
						customizationData: line.customizationData,
						variants: line.variants,
						variantCosts: line.variantCosts,
					},
				});
			}

			return o;
		});

		const origin = appOrigin(req);

		if (processorId === "stripe") {
			const stripeLineItems = lines.map((line) => ({
				quantity: line.quantity,
				price_data: {
					currency: orderCurrency,
					unit_amount: majorUnitsToStripeUnit(orderCurrency, line.unit),
					product_data: { name: line.name },
				},
			}));

			if (shippingAmount > 0) {
				stripeLineItems.push({
					quantity: 1,
					price_data: {
						currency: orderCurrency,
						unit_amount: majorUnitsToStripeUnit(orderCurrency, shippingAmount),
						product_data: { name: "Shipping" },
					},
				});
			}

			const checkoutSession = await stripe.checkout.sessions.create({
				mode: "payment",
				line_items: stripeLineItems,
				success_url: `${origin}/shop/${storeId}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
				cancel_url: `${origin}/shop/${storeId}/cart`,
				client_reference_id: order.id,
				metadata: {
					orderId: order.id,
					storeId,
				},
				customer_email: session.user.email ?? undefined,
			});

			await sqlClient.storeOrder.update({
				where: { id: order.id },
				data: {
					checkoutRef: checkoutSession.id,
					updatedAt: getUtcNowEpoch(),
				},
			});

			return NextResponse.json({ url: checkoutSession.url });
		}

		if (processorId === "paypal") {
			const payPalCreds = await getPayPalCredentialsByStore(storeId, store);
			if (!payPalCreds) {
				return NextResponse.json(
					{
						error:
							"PayPal is not configured (add credentials in store settings or platform env).",
					},
					{ status: 503 },
				);
			}

			const amountStr = formatPayPalAmountValue(total, orderCurrency);
			const returnUrl = `${origin}/api/shop/checkout/paypal/return?orderId=${encodeURIComponent(order.id)}`;
			const cancelUrl = `${origin}/shop/${storeId}/cart`;

			const pp = await createPayPalOrder({
				clientId: payPalCreds.clientId,
				clientSecret: payPalCreds.clientSecret,
				amountValue: amountStr,
				currencyCode: orderCurrency,
				returnUrl,
				cancelUrl,
				customId: order.id,
				description:
					store.name && store.name.length > 0
						? `Order — ${store.name}`
						: `Order ${order.id}`,
			});

			if ("error" in pp) {
				await sqlClient.storeOrder
					.delete({ where: { id: order.id } })
					.catch(() => undefined);
				return NextResponse.json(
					{ error: pp.error || "Could not start PayPal checkout." },
					{ status: 502 },
				);
			}

			await sqlClient.storeOrder.update({
				where: { id: order.id },
				data: {
					checkoutRef: pp.orderId,
					updatedAt: getUtcNowEpoch(),
				},
			});

			return NextResponse.json({ url: pp.approvalUrl });
		}

		if (processorId === "newebpay") {
			return NextResponse.json({
				url: `${origin}/checkout/${encodeURIComponent(order.id)}/newebpay`,
			});
		}

		if (processorId === "cash" || processorId === "atm") {
			return NextResponse.json({
				url: `${origin}/checkout/${encodeURIComponent(order.id)}/${processorId}`,
			});
		}

		if (processorId !== "linepay") {
			return NextResponse.json(
				{
					error:
						"This payment processor is not supported for shop checkout yet.",
				},
				{ status: 400 },
			);
		}

		const linePay = await getLinePayClientByStore(storeId, store);
		if (!linePay) {
			return NextResponse.json(
				{ error: "LINE Pay is not configured for this store." },
				{ status: 503 },
			);
		}

		const subtotalUnits = lines.reduce(
			(s, line) =>
				s + majorUnitsToStripeUnit(orderCurrency, line.unit) * line.quantity,
			0,
		);
		const shippingUnits =
			shippingAmount > 0
				? majorUnitsToStripeUnit(orderCurrency, shippingAmount)
				: 0;
		const totalUnits = subtotalUnits + shippingUnits;

		const requestBody = {
			amount: totalUnits,
			currency: lineCurrency as NonNullable<typeof lineCurrency>,
			orderId: order.id,
			packages: [
				{
					id: "shop_order",
					amount: subtotalUnits,
					name: store.name || "Order",
					products: lines.map((line) => ({
						name: line.name,
						quantity: line.quantity,
						price: majorUnitsToStripeUnit(orderCurrency, line.unit),
					})),
				},
			],
			redirectUrls: {
				confirmUrl: `${origin}/api/shop/checkout/linepay/confirm`,
				cancelUrl: `${origin}/shop/${storeId}/cart`,
			},
			options: {
				payment: { capture: true as boolean },
				display: { locale: "en" as const },
				...(shippingUnits > 0
					? {
							shipping: {
								feeAmount: shippingUnits,
							},
						}
					: {}),
			},
		};

		const lpRes = await linePay.request.send({
			body: requestBody,
		});

		if (lpRes.body.returnCode !== "0000" || !lpRes.body.info?.paymentUrl?.web) {
			logger.error("LINE Pay request failed", {
				metadata: {
					orderId: order.id,
					returnCode: lpRes.body.returnCode,
					returnMessage: lpRes.body.returnMessage,
				},
				tags: ["shop", "checkout", "linepay"],
			});

			await sqlClient.storeOrder
				.delete({ where: { id: order.id } })
				.catch(() => undefined);

			return NextResponse.json(
				{
					error:
						lpRes.body.returnMessage ||
						"Could not start LINE Pay. Try again or use Stripe.",
				},
				{ status: 502 },
			);
		}

		const transactionId = lpRes.body.info.transactionId;

		await sqlClient.storeOrder.update({
			where: { id: order.id },
			data: {
				checkoutRef: transactionId,
				checkoutAttributes: JSON.stringify({
					...checkoutAttrs,
					linePayTransactionId: transactionId,
				}),
				updatedAt: getUtcNowEpoch(),
			},
		});

		return NextResponse.json({ url: lpRes.body.info.paymentUrl.web });
	} catch (err: unknown) {
		logger.error("Shop checkout failed", {
			metadata: {
				error: err instanceof Error ? err.message : String(err),
			},
			tags: ["shop", "checkout", "error"],
		});
		return NextResponse.json(
			{ error: "Checkout failed. Try again later." },
			{ status: 500 },
		);
	}
}
