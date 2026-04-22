import type { Prisma } from "@prisma/client";

/**
 * Minimal shape required to mark an order as paid and detect order subtype.
 */
export const markOrderAsPaidInputArgs = {
	include: {
		Store: {
			select: {
				id: true,
				level: true,
				paymentCredentials: true,
			},
		},
		PaymentMethod: true,
		OrderItemView: {
			select: {
				id: true,
				productId: true,
				name: true,
			},
		},
	},
} satisfies Prisma.StoreOrderDefaultArgs;

export type MarkOrderAsPaidInput = Prisma.StoreOrderGetPayload<
	typeof markOrderAsPaidInputArgs
>;

/**
 * Full relation shape used by existing order flows after payment updates.
 */
export const storeOrderPaymentResultArgs = {
	include: {
		Store: true,
		OrderNotes: true,
		OrderItemView: true,
		User: true,
		ShippingMethod: true,
		PaymentMethod: true,
	},
} satisfies Prisma.StoreOrderDefaultArgs;

export type StoreOrderPaymentResult = Prisma.StoreOrderGetPayload<
	typeof storeOrderPaymentResultArgs
>;
