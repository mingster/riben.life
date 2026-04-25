import { z } from "zod";

export const confirmCustomerRsvpSchema = z.object({
	rsvpId: z.string().min(1, "RSVP ID is required"),
});

export type ConfirmCustomerRsvpInput = z.infer<
	typeof confirmCustomerRsvpSchema
>;
