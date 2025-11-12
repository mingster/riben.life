import type { StoreAnnouncement } from "@prisma/client";
import { formatDateTime } from "@/utils/datetime-utils";

export interface AnnouncementColumn {
	id: string;
	storeId: string;
	message: string;
	updatedAt: string;
	createdAt: string;
	updatedAtIso: string;
	createdAtIso: string;
}

export const mapAnnouncementToColumn = (
	announcement: StoreAnnouncement,
	storeId: string,
): AnnouncementColumn => ({
	id: announcement.id,
	storeId,
	message: announcement.message ?? "",
	updatedAt: formatDateTime(announcement.updatedAt),
	createdAt: formatDateTime(announcement.createdAt),
	updatedAtIso: announcement.updatedAt.toISOString(),
	createdAtIso: announcement.createdAt.toISOString(),
});
