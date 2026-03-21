import type {
	StoreDefaultArgs,
	StoreGetPayload,
} from "@/generated/prisma/models/Store";

const storeLayoutCategories = {
	where: { isFeatured: true },
	orderBy: { sortOrder: "asc" as const },
} as const;

/** Lighter query for `generateMetadata` (title only). */
export const storeLayoutMetadataArgs = {
	include: {
		Categories: storeLayoutCategories,
		StoreAnnouncement: true,
	},
} satisfies StoreDefaultArgs;

export type StoreLayoutMetadata = StoreGetPayload<
	typeof storeLayoutMetadataArgs
>;

/**
 * Prisma args for `store.findFirst` in the store-front root layout (navbar/footer).
 */
export const storeLayoutArgs = {
	include: {
		Categories: storeLayoutCategories,
		StoreAnnouncement: true,
		rsvpSettings: true,
	},
} satisfies StoreDefaultArgs;

export type StoreLayoutData = StoreGetPayload<typeof storeLayoutArgs>;
