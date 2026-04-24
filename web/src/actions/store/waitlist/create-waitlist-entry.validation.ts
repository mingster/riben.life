import { z } from "zod";
import { validatePhoneNumber } from "@/utils/phone-utils";

const createWaitlistEntryBaseSchema = z
	.object({
		storeId: z.string().min(1, "Store ID is required"),
		customerId: z.string().nullable().optional(),
		phone: z.string().nullable().optional(),
		numOfAdult: z.coerce.number().int().min(1).default(1),
		numOfChild: z.coerce.number().int().min(0).default(0),
		name: z.string().optional().nullable(),
		lastName: z.string().optional().nullable(),
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

/** Used by the server action (name required enforced in action when store flag is on). */
export const createWaitlistEntrySchema = createWaitlistEntryBaseSchema;

export type CreateWaitlistEntryInput = z.infer<
	typeof createWaitlistEntryBaseSchema
>;

/**
 * Client form schema: when `requireName` is true, name must be non-empty after trim.
 * When `requirePhone` is true, phone must be non-empty and valid.
 */
export function buildCreateWaitlistEntrySchema(
	requireName: boolean,
	requirePhone = false,
) {
	if (requireName && requirePhone) {
		return createWaitlistEntryBaseSchema
			.refine((data) => (data.name ?? "").trim().length > 0, {
				message: "waitlist_name_required",
				path: ["name"],
			})
			.refine(
				(data) => {
					const p = String(data.phone ?? "").trim();
					return p.length > 0 && validatePhoneNumber(p);
				},
				{ message: "waitlist_phone_required", path: ["phone"] },
			);
	}
	if (requireName) {
		return createWaitlistEntryBaseSchema.refine(
			(data) => (data.name ?? "").trim().length > 0,
			{ message: "waitlist_name_required", path: ["name"] },
		);
	}
	if (requirePhone) {
		return createWaitlistEntryBaseSchema.refine(
			(data) => {
				const p = String(data.phone ?? "").trim();
				return p.length > 0 && validatePhoneNumber(p);
			},
			{ message: "waitlist_phone_required", path: ["phone"] },
		);
	}
	return createWaitlistEntryBaseSchema;
}
