import { z } from "zod";

import { orderItemViewFormRowsSchema } from "./order-item-view-form.validation";

export const updateOrderEditFormSchema = z.object({
	facilityId: z.string().optional().nullable(),
	orderNum: z.number().optional(),
	paymentMethodId: z.string().min(1, {
		error: "payment method is required",
	}),
	shippingMethodId: z.string().min(1, {
		error: "shipping method is required",
	}),
	OrderItemView: orderItemViewFormRowsSchema,
});

export type UpdateOrderEditFormInput = z.infer<
	typeof updateOrderEditFormSchema
>;
