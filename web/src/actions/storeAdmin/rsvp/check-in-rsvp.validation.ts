import { z } from "zod";

export const checkInRsvpSchema = z
	.object({
		rsvpId: z.string().optional(),
		checkInCode: z.string().optional(),
	})
	.refine(
		(data) => {
			const hasRsvpId = data.rsvpId != null && data.rsvpId.trim() !== "";
			const hasCheckInCode =
				data.checkInCode != null && data.checkInCode.trim() !== "";
			return hasRsvpId || hasCheckInCode;
		},
		{ message: "Either rsvpId or checkInCode is required", path: ["rsvpId"] },
	);

export type CheckInRsvpInput = z.infer<typeof checkInRsvpSchema>;
