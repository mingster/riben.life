import type { Prisma } from "@prisma/client";

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
} satisfies Prisma.StoreDefaultArgs;

export type StoreLayoutMetadata = Prisma.StoreGetPayload<
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
} satisfies Prisma.StoreDefaultArgs;

export type StoreLayoutData = Prisma.StoreGetPayload<typeof storeLayoutArgs>;
