import type { StoreAnnouncement } from "@prisma/client";
import { formatDateTime, epochToDate } from "@/utils/datetime-utils";

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
	updatedAt: formatDateTime(epochToDate(announcement.updatedAt) ?? new Date()),
	createdAt: formatDateTime(epochToDate(announcement.createdAt) ?? new Date()),
	updatedAtIso:
		epochToDate(announcement.updatedAt)?.toISOString() ??
		new Date().toISOString(),
	createdAtIso:
		epochToDate(announcement.createdAt)?.toISOString() ??
		new Date().toISOString(),
});
