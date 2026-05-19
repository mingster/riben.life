import type {
	StoreAnnouncement,
	StoreAnnouncementLocale,
} from "@prisma/client";
import { epochToDate, formatDateTime } from "@/utils/datetime-utils";

export interface AnnouncementColumn {
	id: string;
	storeId: string;
	name: string | null;
	published: boolean;
	locales: StoreAnnouncementLocale[];
	updatedAt: string;
	createdAt: string;
	updatedAtIso: string;
	createdAtIso: string;
}

export const mapAnnouncementToColumn = (
	announcement: StoreAnnouncement & { locales: StoreAnnouncementLocale[] },
	storeId: string,
): AnnouncementColumn => ({
	id: announcement.id,
	storeId,
	name: announcement.name ?? null,
	published: announcement.published,
	locales: announcement.locales,
	updatedAt: formatDateTime(epochToDate(announcement.updatedAt) ?? new Date()),
	createdAt: formatDateTime(epochToDate(announcement.createdAt) ?? new Date()),
	updatedAtIso:
		epochToDate(announcement.updatedAt)?.toISOString() ??
		new Date().toISOString(),
	createdAtIso:
		epochToDate(announcement.createdAt)?.toISOString() ??
		new Date().toISOString(),
});
