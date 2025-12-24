import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { RsvpCalendarClient } from "./components/client-rsvp-calendar";
import { startOfWeek, endOfWeek } from "date-fns";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { Rsvp } from "@/types";
import { getUtcNow, dateToEpoch } from "@/utils/datetime-utils";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function RsvpPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	// Get RSVPs for a wider range (current week ± 2 weeks) to support navigation
	// Use UTC to ensure server-independent time calculations
	const now = getUtcNow();

	// Get start of week (Sunday) using UTC
	const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
	const daysToSunday = dayOfWeek === 0 ? 0 : dayOfWeek; // Days to subtract to get to Sunday
	const weekStart = new Date(
		Date.UTC(
			now.getUTCFullYear(),
			now.getUTCMonth(),
			now.getUTCDate() - daysToSunday,
			0,
			0,
			0,
			0,
		),
	);

	// Get end of week (Saturday) using UTC - 6 days after Sunday at 23:59:59.999
	const weekEnd = new Date(
		Date.UTC(
			weekStart.getUTCFullYear(),
			weekStart.getUTCMonth(),
			weekStart.getUTCDate() + 6, // Saturday is 6 days after Sunday
			23,
			59,
			59,
			999,
		),
	);

	// Extend range by 2 weeks before and after using UTC
	const rangeStart = new Date(
		Date.UTC(
			weekStart.getUTCFullYear(),
			weekStart.getUTCMonth(),
			weekStart.getUTCDate() - 14,
			0,
			0,
			0,
			0,
		),
	);
	const rangeEnd = new Date(
		Date.UTC(
			weekEnd.getUTCFullYear(),
			weekEnd.getUTCMonth(),
			weekEnd.getUTCDate() + 14,
			23,
			59,
			59,
			999,
		),
	);

	const rangeStartEpoch = dateToEpoch(rangeStart);
	const rangeEndEpoch = dateToEpoch(rangeEnd);
	if (!rangeStartEpoch || !rangeEndEpoch) {
		throw new Error("Invalid date range");
	}
	const [rsvps, rsvpSettings, storeSettings, store] = await Promise.all([
		sqlClient.rsvp.findMany({
			where: {
				storeId: params.storeId,
				rsvpTime: {
					gte: rangeStartEpoch,
					lte: rangeEndEpoch,
				},
			},
			include: {
				Store: true,
				Customer: true,
				CreatedBy: true,
				Order: true,
				Facility: true,
				FacilityPricingRule: true,
			},
			orderBy: { rsvpTime: "asc" },
		}),
		sqlClient.rsvpSettings.findFirst({
			where: { storeId: params.storeId },
		}),
		sqlClient.storeSettings.findFirst({
			where: { storeId: params.storeId },
		}),
		sqlClient.store.findUnique({
			where: { id: params.storeId },
			select: { defaultTimezone: true, useBusinessHours: true },
		}),
	]);

	//console.log(rsvps.map((r) => r.Customer?.name).join(", "));

	// Transform BigInt (epoch timestamps) and Decimal to numbers for client components
	const formattedData: Rsvp[] = (rsvps as Rsvp[]).map((rsvp) => {
		const transformed = { ...rsvp };
		transformPrismaDataForJson(transformed);
		return transformed as Rsvp;
	});

	if (rsvpSettings) {
		transformPrismaDataForJson(rsvpSettings);
	}
	if (storeSettings) {
		transformPrismaDataForJson(storeSettings);
	}

	return (
		<Container>
			<RsvpCalendarClient
				serverData={formattedData}
				rsvpSettings={rsvpSettings}
				storeSettings={storeSettings}
				storeTimezone={store?.defaultTimezone || "Asia/Taipei"}
				storeUseBusinessHours={store?.useBusinessHours ?? true}
			/>
		</Container>
	);
}
