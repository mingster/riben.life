import { z } from "zod";

/** Empty body — confirmation is UI-only; storeId comes from bound args. */
export const downgradeStoreToFreeSchema = z.object({});

export type DowngradeStoreToFreeInput = z.infer<
	typeof downgradeStoreToFreeSchema
>;
