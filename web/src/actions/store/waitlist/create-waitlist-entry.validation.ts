import { z } from "zod";
import { validatePhoneNumber } from "@/utils/phone-utils";

export const createWaitlistEntrySchema = z
	.object({
		storeId: z.string().min(1, "Store ID is required"),
		customerId: z.string().nullable().optional(),
		name: z.string().nullable().optional(),
		lastName: z.string().nullable().optional(),
		phone: z.string().nullable().optional(),
		numOfAdult: z.coerce.number().int().min(1).default(1),
		numOfChild: z.coerce.number().int().min(0).default(0),
		message: z.string().nullable().optional(),
	})
	.refine(
		(data) => {
			if (data.phone) {
				const phone = String(data.phone).trim();
				return phone.length === 0 || validatePhoneNumber(phone);
			}
			return true;
		},
		{ message: "phone_number_invalid_format", path: ["phone"] },
	);

export type CreateWaitlistEntryInput = z.infer<
	typeof createWaitlistEntrySchema
>;
