import type {
	StoreOrderDefaultArgs,
	StoreOrderGetPayload,
} from "@/generated/prisma/models/StoreOrder";

/**
 * Minimal shape required to mark an order as paid and detect order subtype.
 */
export const markOrderAsPaidInputArgs = {
	include: {
		Store: {
			select: {
				id: true,
				level: true,
				LINE_PAY_ID: true,
				STRIPE_SECRET_KEY: true,
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
} satisfies StoreOrderDefaultArgs;

export type MarkOrderAsPaidInput = StoreOrderGetPayload<
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
} satisfies StoreOrderDefaultArgs;

export type StoreOrderPaymentResult = StoreOrderGetPayload<
	typeof storeOrderPaymentResultArgs
>;
