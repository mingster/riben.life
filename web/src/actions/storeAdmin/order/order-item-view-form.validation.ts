import { z } from "zod";

/** Line item shape for admin order edit / refund field arrays. */
export const orderItemViewFormRowSchema = z.object({
	productId: z.string().min(1, {
		error: "product is required",
	}),
	quantity: z.number().min(1, {
		error: "quantity is required",
	}),
});

export const orderItemViewFormRowsSchema = z
	.array(orderItemViewFormRowSchema)
	.min(1, {
		error: "at least one item is required",
	})
	.optional();
