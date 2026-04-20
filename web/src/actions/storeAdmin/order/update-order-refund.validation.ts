import { z } from "zod";

import { orderItemViewFormRowsSchema } from "./order-item-view-form.validation";

export const updateOrderRefundFormSchema = z.object({
	OrderItemView: orderItemViewFormRowsSchema,
});

export type UpdateOrderRefundFormInput = z.infer<
	typeof updateOrderRefundFormSchema
>;
