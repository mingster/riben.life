import type { RsvpBlacklist } from "@/types";

export interface RsvpBlacklistColumn {
	id: string;
	storeId: string;
	userId: string;
	userName: string | null;
	userEmail: string | null;
	createdAt: bigint;
	updatedAt: bigint;
}

export const mapRsvpBlacklistToColumn = (
	blacklist: RsvpBlacklist & {
		User?: {
			id: string;
			name: string | null;
			email: string | null;
		} | null;
	},
): RsvpBlacklistColumn => {
	return {
		id: blacklist.id,
		storeId: blacklist.storeId,
		userId: blacklist.userId,
		userName: blacklist.User?.name ?? null,
		userEmail: blacklist.User?.email ?? null,
		createdAt: blacklist.createdAt,
		updatedAt: blacklist.updatedAt,
	};
};
