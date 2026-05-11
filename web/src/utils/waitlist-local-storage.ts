import { normalizePhoneNumber } from "@/utils/phone-utils";

/** Persists active ticket after join (shared with {@link WaitlistJoinClient}). */
export const WAITLIST_STORAGE_KEY = "riben.life_waitlist";

/** Draft join form fields per store (shared with the LIFF waitlist client component). */
export const WAITLIST_FORM_DRAFT_PREFIX = "riben.life_waitlist_form_draft:";

export function waitlistFormDraftStorageKey(storeId: string): string {
	return `${WAITLIST_FORM_DRAFT_PREFIX}${storeId}`;
}

export type WaitlistFormDraft = {
	name?: string | null;
	lastName?: string | null;
	phone?: string | null;
	numOfAdult?: number;
	numOfChild?: number;
};

export function loadWaitlistFormDraft(
	storeId: string,
): WaitlistFormDraft | null {
	if (typeof window === "undefined") {
		return null;
	}
	try {
		const raw = localStorage.getItem(waitlistFormDraftStorageKey(storeId));
		if (!raw) {
			return null;
		}
		const parsed = JSON.parse(raw) as WaitlistFormDraft;
		return parsed && typeof parsed === "object" ? parsed : null;
	} catch {
		return null;
	}
}

export function saveWaitlistFormDraft(
	storeId: string,
	draft: WaitlistFormDraft,
): void {
	try {
		localStorage.setItem(
			waitlistFormDraftStorageKey(storeId),
			JSON.stringify(draft),
		);
	} catch {
		// quota / private mode
	}
}

export function clearWaitlistFormDraft(storeId: string): void {
	try {
		localStorage.removeItem(waitlistFormDraftStorageKey(storeId));
	} catch {
		// ignore
	}
}

export type WaitlistActiveStorageEntry = {
	id: string;
	storeId: string;
	queueNumber: number;
	verificationCode: string;
	sessionBlock: string;
	expiry: number;
};

export function saveWaitlistToStorage(entry: WaitlistActiveStorageEntry): void {
	try {
		localStorage.setItem(WAITLIST_STORAGE_KEY, JSON.stringify(entry));
	} catch {
		// ignore
	}
}

export function clearWaitlistFromStorage(): void {
	try {
		localStorage.removeItem(WAITLIST_STORAGE_KEY);
	} catch {
		// ignore
	}
}

export function loadWaitlistFromStorage(
	storeId: string,
): WaitlistActiveStorageEntry | null {
	try {
		const raw = localStorage.getItem(WAITLIST_STORAGE_KEY);
		if (!raw) return null;
		const p = JSON.parse(raw) as Record<string, unknown>;
		if (p.storeId !== storeId) return null;
		if (typeof p.expiry === "number" && Date.now() > p.expiry) return null;
		if (
			typeof p.id === "string" &&
			typeof p.verificationCode === "string" &&
			typeof p.queueNumber === "number"
		) {
			return {
				id: p.id,
				storeId: p.storeId as string,
				queueNumber: p.queueNumber,
				verificationCode: p.verificationCode,
				sessionBlock:
					typeof p.sessionBlock === "string" ? p.sessionBlock : "morning",
				expiry: typeof p.expiry === "number" ? p.expiry : Date.now() + 86400000,
			};
		}
	} catch {
		// ignore
	}
	return null;
}

const PHONE_COUNTRY_CODE_KEY = "phone_country_code";
const PHONE_LOCAL_NUMBER_KEY = "phone_local_number";

/** Same phone restore path as {@link WaitlistJoinClient} (sign-in / OTP UI). */
export function getSavedPhoneFromFormPhoneOtp(): string | null {
	if (typeof window === "undefined") return null;
	const countryCode = localStorage.getItem(PHONE_COUNTRY_CODE_KEY);
	const localNumber = localStorage.getItem(PHONE_LOCAL_NUMBER_KEY);
	if (!countryCode || !localNumber?.trim()) return null;
	if (countryCode !== "+886" && countryCode !== "+1") return null;
	let local = localNumber.trim();
	if (countryCode === "+886" && local.startsWith("0")) {
		local = local.slice(1);
	}
	const full = `${countryCode}${local}`;
	return normalizePhoneNumber(full);
}

/** Party size options (schema: adults ≥ 1, children ≥ 0). */
export const WAITLIST_ADULT_COUNT_OPTIONS = Array.from(
	{ length: 20 },
	(_, i) => i + 1,
);
export const WAITLIST_CHILD_COUNT_OPTIONS = Array.from(
	{ length: 21 },
	(_, i) => i,
);
