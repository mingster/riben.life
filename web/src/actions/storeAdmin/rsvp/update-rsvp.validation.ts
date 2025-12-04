import { z } from "zod";

export const updateRsvpSchema = z.object({
	id: z.string().min(1, "rsvpId is required"),
	userId: z.string().nullable().optional(),
	facilityId: z.string().min(1, "Facility is required"),
	numOfAdult: z.coerce.number().int().min(1).default(1),
	numOfChild: z.coerce.number().int().min(0).default(0),
	rsvpTime: z.coerce.date(),
	arriveTime: z.coerce.date().nullable().optional(),
	status: z.coerce.number().int().default(0),
	message: z.string().nullable().optional(),
	alreadyPaid: z.boolean().default(false),
	confirmedByStore: z.boolean().default(false),
	confirmedByCustomer: z.boolean().default(false),
	facilityCost: z.coerce.number().min(0).nullable().optional(),
	facilityCredit: z.coerce.number().min(0).nullable().optional(),
	pricingRuleId: z.string().nullable().optional(),
});

export type UpdateRsvpInput = z.infer<typeof updateRsvpSchema>;
