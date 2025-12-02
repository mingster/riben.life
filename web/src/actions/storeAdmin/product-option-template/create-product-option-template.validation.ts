import { z } from "zod";

// 規格 | 甜度/冰 | 配料
export const createProductOptionTemplateSchema = z.object({
	optionName: z.string().min(1),
	isRequired: z.boolean(), //必選
	isMultiple: z.boolean(), // 0:radiobox|1:checkboxes

	// 至少選1項 | 最多選3項
	minSelection: z.coerce.number().int().min(0),
	maxSelection: z.coerce.number().int().min(1),
	allowQuantity: z.boolean(), // 允許選擇數量
	minQuantity: z.coerce.number().int().min(0),
	maxQuantity: z.coerce.number().int().min(1),
	selections: z.string().min(1),
	sortOrder: z.coerce.number().int().min(1),
});
