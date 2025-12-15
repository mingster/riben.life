import { z } from "zod";
import { StoreLedgerType } from "@/types/enum";

export const createStoreLedgerSchema = z.object({
	orderId: z.string().min(1, "Order ID is required"),
	amount: z.coerce.number().positive("Amount must be positive"),
	fee: z.coerce.number().default(0),
	platformFee: z.coerce.number().default(0),
	currency: z.string().min(1).default("twd"),
	type: z.nativeEnum(StoreLedgerType),
	description: z.string().min(1, "Description is required"),
	note: z.string().optional().nullable(),
	availability: z.coerce.number().optional(), // Epoch milliseconds, defaults to now if not provided
});

export type CreateStoreLedgerInput = z.infer<typeof createStoreLedgerSchema>;
