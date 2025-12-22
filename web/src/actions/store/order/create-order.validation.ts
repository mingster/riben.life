import { z } from "zod";

export const createOrderSchema = z
	.object({
		storeId: z.string().min(1, "Store ID is required"),
		userId: z.string().optional().nullable(),
		facilityId: z.string().optional().nullable(),
		total: z.coerce.number().positive("Total must be positive"),
		currency: z.string().min(1, "Currency is required"),
		productIds: z
			.array(z.string().min(1))
			.min(1, "At least one product is required"),
		quantities: z
			.array(z.coerce.number().int().positive())
			.min(1, "At least one quantity is required"),
		unitPrices: z
			.array(z.coerce.number().positive())
			.min(1, "At least one unit price is required"),
		variants: z.array(z.string().nullable()).optional(),
		variantCosts: z.array(z.string().nullable()).optional(),
		orderNote: z.string().optional().nullable(),
		shippingMethodId: z.string().min(1, "Shipping method ID is required"),
		paymentMethodId: z.string().min(1, "Payment method ID is required"),
	})
	.refine((data) => data.productIds.length === data.quantities.length, {
		message: "productIds and quantities arrays must have the same length",
		path: ["quantities"],
	})
	.refine((data) => data.productIds.length === data.unitPrices.length, {
		message: "productIds and unitPrices arrays must have the same length",
		path: ["unitPrices"],
	});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
