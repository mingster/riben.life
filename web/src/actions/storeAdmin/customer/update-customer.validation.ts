import { z } from "zod";

export const updateCustomerSchema = z.object({
	customerId: z.string(),
	email: z.string().email("Invalid email address"),
	name: z.string().min(1, "Name is required"),
	password: z.string().optional(),
	locale: z.string().min(1, "Locale is required"),
	role: z.string().min(1, "Role is required"),
	storeId: z.string(),
	timezone: z.string().min(1, "Timezone is required"),
	stripeCustomerId: z.string().optional(),
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
