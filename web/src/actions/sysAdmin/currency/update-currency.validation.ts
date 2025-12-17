import { z } from "zod";

export const updateCurrencySchema = z.object({
	id: z.string().min(1, "Currency ID is required"),
	name: z.string().min(1, "Currency name is required"),
	symbol: z.string().optional().nullable(),
	ISOdigits: z.coerce.number().int().optional().nullable(),
	ISOnum: z.coerce.number().int().optional().nullable(),
	decimals: z.coerce.number().int().optional().nullable(),
	demonym: z.string().min(1, "Demonym is required"),
	majorPlural: z.string().optional().nullable(),
	majorSingle: z.string().optional().nullable(),
	minorPlural: z.string().optional().nullable(),
	minorSingle: z.string().optional().nullable(),
	numToBasic: z.coerce.number().int().optional().nullable(),
	symbolNative: z.string().min(1, "Native symbol is required"),
});

export type UpdateCurrencyInput = z.infer<typeof updateCurrencySchema>;
