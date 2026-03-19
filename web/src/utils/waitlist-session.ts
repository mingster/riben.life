import BusinessHours from "@/lib/businessHours";

export type WaitlistSessionBlock = "morning" | "afternoon" | "evening";

/**
 * Resolves waitlist session band (早/午/晚) from store business hours, or wall-clock
 * thirds when hours are disabled or invalid. When hours are enforced and the store is
 * closed, returns `{ closed: true }`.
 */
export function resolveWaitlistSessionBlock(params: {
	businessHoursJson: string | null;
	useBusinessHours: boolean;
	defaultTimezone: string;
}): { block: WaitlistSessionBlock } | { closed: true } {
	const { businessHoursJson, useBusinessHours, defaultTimezone } = params;
	const tz = defaultTimezone || "Asia/Taipei";

	if (useBusinessHours && businessHoursJson?.trim()) {
		try {
			const parsed = JSON.parse(businessHoursJson) as Record<string, unknown>;
			if (!parsed.timeZone) {
				parsed.timeZone = tz;
			}
			const bh = new BusinessHours(JSON.stringify(parsed));
			const block = bh.getWaitlistSessionBlockOrNull();
			if (block === null) {
				return { closed: true };
			}
			return { block };
		} catch {
			// Invalid JSON — fall back to wall-clock thirds
		}
	}

	return { block: getWallClockSessionThird(tz) };
}

function getWallClockSessionThird(timezone: string): WaitlistSessionBlock {
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
	const parts = formatter.formatToParts(new Date());
	const h = Number.parseInt(
		parts.find((p) => p.type === "hour")?.value || "0",
		10,
	);
	const m = Number.parseInt(
		parts.find((p) => p.type === "minute")?.value || "0",
		10,
	);
	const mins = h * 60 + m;
	if (mins < 8 * 60) return "morning";
	if (mins < 16 * 60) return "afternoon";
	return "evening";
}
