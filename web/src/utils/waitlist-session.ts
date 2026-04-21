import BusinessHours from "@/lib/businessHours";

export type WaitlistSessionBlock = "morning" | "afternoon" | "evening";

/**
 * Resolves whether a customer may join the waitlist now and which session band to use.
 * When business hours JSON is valid, applies {@link BusinessHours.getWaitlistJoinSessionBlockOrNull}.
 * Otherwise falls back to {@link resolveWaitlistSessionBlock} (wall-clock thirds; ignores offset).
 */
export function resolveWaitlistJoinEligibility(params: {
	businessHoursJson: string | null;
	useBusinessHours: boolean;
	defaultTimezone: string;
	canGetNumBefore: number;
}): { ok: true; sessionBlock: WaitlistSessionBlock } | { ok: false } {
	const {
		businessHoursJson,
		useBusinessHours,
		defaultTimezone,
		canGetNumBefore,
	} = params;
	const tz = defaultTimezone || "Asia/Taipei";

	if (useBusinessHours && businessHoursJson?.trim()) {
		try {
			const parsed = JSON.parse(businessHoursJson) as Record<string, unknown>;
			if (!parsed.timeZone) {
				parsed.timeZone = tz;
			}
			const bh = new BusinessHours(JSON.stringify(parsed));
			const block = bh.getWaitlistJoinSessionBlockOrNull(canGetNumBefore);
			if (block === null) {
				return { ok: false };
			}
			return { ok: true, sessionBlock: block };
		} catch {
			// Invalid JSON — fall back below
		}
	}

	const fb = resolveWaitlistSessionBlock({
		businessHoursJson,
		useBusinessHours,
		defaultTimezone: tz,
	});
	if ("closed" in fb) {
		return { ok: false };
	}
	return { ok: true, sessionBlock: fb.block };
}

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
