import { z } from "zod/v4";

export const updateStoreContactInfoSchema = z.object({
	storeId: z.string().min(1),
	aboutUs: z.string().optional().nullable(),
	supportEmail: z.string().optional().nullable(),
	supportPhoneNumber: z.string().optional().nullable(),
	facebookUrl: z.string().optional().nullable(),
	igUrl: z.string().optional().nullable(),
	lineId: z.string().optional().nullable(),
	telegramId: z.string().optional().nullable(),
	twitterId: z.string().optional().nullable(),
	whatsappId: z.string().optional().nullable(),
	wechatId: z.string().optional().nullable(),
});

export type UpdateStoreContactInfoInput = z.infer<
	typeof updateStoreContactInfoSchema
>;
