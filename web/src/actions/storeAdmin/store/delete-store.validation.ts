import { z } from "zod";

export const deleteStoreSchema = z.object({});

export type DeleteStoreInput = z.infer<typeof deleteStoreSchema>;
