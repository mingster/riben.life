import enTranslations from "@/app/i18n/locales/en/translation.json";
import { getNotificationT } from "@/lib/notification/notification-i18n";
import { RsvpStatus } from "@/types/enum";

/** Maps `RsvpStatus` value to `translation.json` keys used by `getNotificationT`. */
const RSVP_STATUS_NOTIF_KEYS: Record<number, string> = {
	[RsvpStatus.Pending]: "notif_status_pending",
	[RsvpStatus.ReadyToConfirm]: "notif_status_ready_to_confirm",
	[RsvpStatus.Ready]: "notif_status_ready",
	[RsvpStatus.ConfirmedByCustomer]: "notif_status_confirmed_by_customer",
	[RsvpStatus.CheckedIn]: "notif_status_checked_in",
	[RsvpStatus.Completed]: "notif_status_completed",
	[RsvpStatus.Cancelled]: "notif_status_cancelled",
	[RsvpStatus.NoShow]: "notif_status_no_show",
};

const enDict = enTranslations as Record<string, string>;

function buildEnglishLabelToRsvpStatusCode(): Readonly<Record<string, number>> {
	const map: Record<string, number> = {};
	for (const [codeStr, key] of Object.entries(RSVP_STATUS_NOTIF_KEYS)) {
		const code = Number(codeStr);
		const label = enDict[key];
		if (label) {
			map[label] = code;
		}
	}
	return map;
}

const ENGLISH_STATUS_LABEL_TO_CODE: Readonly<Record<string, number>> =
	buildEnglishLabelToRsvpStatusCode();

/**
 * Returns a user-facing RSVP status string for emails / templates in `locale`.
 * Accepts numeric `RsvpStatus`, digit strings, or English labels matching `en` `notif_status_*` values.
 */
export function translateRsvpStatusForNotification(
	locale: string,
	status: unknown,
): string {
	if (status == null || status === "") {
		return "";
	}

	let code: number | null = null;

	if (typeof status === "bigint") {
		const n = Number(status);
		if (!Number.isFinite(n)) {
			return String(status);
		}
		code = Math.trunc(n);
	} else if (typeof status === "number" && Number.isFinite(status)) {
		code = Math.trunc(status);
	} else if (typeof status === "string") {
		const trimmed = status.trim();
		if (trimmed === "") {
			return "";
		}
		if (/^-?\d+$/.test(trimmed)) {
			code = Number.parseInt(trimmed, 10);
		} else {
			const fromEnglishLabel = ENGLISH_STATUS_LABEL_TO_CODE[trimmed];
			if (fromEnglishLabel != null) {
				code = fromEnglishLabel;
			} else {
				return trimmed;
			}
		}
	} else {
		return String(status);
	}

	const i18nKey = RSVP_STATUS_NOTIF_KEYS[code];
	if (!i18nKey) {
		return String(status);
	}

	return getNotificationT(locale)(i18nKey);
}
