import { z } from "zod";

export const updateCustomerSchema = z.object({
	storeId: z.string().min(1, "Store ID is required"),
	customerId: z.string(),
	email: z.string().email("Invalid email address"),
	name: z.string().min(1, "Name is required"),
	password: z.string().optional(),
	locale: z.string().min(1, "Locale is required"),
	memberRole: z.string().min(1, "Member role is required"),
	timezone: z.string().min(1, "Timezone is required"),
	phone: z.string().optional(),
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
