import { z } from "zod";

export const seatWaitlistEntrySchema = z.object({
	waitlistId: z.string().min(1, "Waitlist entry ID is required"),
	facilityId: z.string().min(1, "Facility (table) is required"),
});

export type SeatWaitlistEntryInput = z.infer<typeof seatWaitlistEntrySchema>;
