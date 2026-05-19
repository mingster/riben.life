import { z } from "zod";

export const deleteAnnouncementLocaleSchema = z.object({
	id: z.string().min(1),
});

export type DeleteAnnouncementLocaleInput = z.infer<
	typeof deleteAnnouncementLocaleSchema
>;
