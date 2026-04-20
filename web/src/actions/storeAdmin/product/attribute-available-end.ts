import { dateToEpoch } from "@/utils/datetime-utils";

/** Maps admin datetime-local string to Prisma `availableEndDate` (epoch ms). */
export function attributeAvailableEndToPrisma(
	raw: string | undefined,
): bigint | null {
	const s = raw?.trim();
	if (!s) {
		return null;
	}
	const d = new Date(s);
	if (Number.isNaN(d.getTime())) {
		return null;
	}
	return dateToEpoch(d);
}
