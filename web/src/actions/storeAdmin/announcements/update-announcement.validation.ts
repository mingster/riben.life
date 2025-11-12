import { createAnnouncementSchema } from "./create-announcement.validation";
import { z } from "zod";

export const updateAnnouncementSchema = createAnnouncementSchema.extend({
	id: z.string().min(1),
});
