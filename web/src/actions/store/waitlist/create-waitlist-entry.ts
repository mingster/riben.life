"use server";

import { type WaitList, WaitListStatus } from "@prisma/client";
import { headers } from "next/headers";
import { getT } from "@/app/i18n";
import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { baseClient } from "@/utils/actions/safe-action";
import {
	getStoreTodayStartEndEpoch,
	getUtcNowEpoch,
} from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";
import { validatePhoneNumber } from "@/utils/phone-utils";
import { resolveWaitlistJoinEligibility } from "@/utils/waitlist-session";
import { createWaitlistEntrySchema } from "./create-waitlist-entry.validation";

const VERIFICATION_CODE_LENGTH = 6;
const MAX_VERIFICATION_CODE_ATTEMPTS = 10;

function generateVerificationCode(): string {
	return String(Math.floor(Math.random() * 1_000_000)).padStart(
		VERIFICATION_CODE_LENGTH,
		"0",
	);
}

export const createWaitlistEntryAction = baseClient
	.metadata({ name: "createWaitlistEntry" })
	.schema(createWaitlistEntrySchema)
	.action(async ({ parsedInput }) => {
		const {
			storeId,
			customerId: inputCustomerId,
			phone: inputPhone,
			numOfAdult,
			numOfChild,
			name: inputName,
			lastName: inputLastName,
		} = parsedInput;

		const session = await auth.api.getSession({
			headers: await headers(),
		});
		const sessionUserId = session?.user?.id;

		const [store, waitListSettings, storeSettings] = await Promise.all([
			sqlClient.store.findUnique({
				where: { id: storeId },
				select: {
					id: true,
					name: true,
					defaultTimezone: true,
					useBusinessHours: true,
				},
			}),
			sqlClient.waitListSettings.findUnique({
				where: { storeId },
				select: {
					enabled: true,
					requireSignIn: true,
					requireName: true,
					requirePhone: true,
					requireLineOnly: true,
					canGetNumBefore: true,
				},
			}),
			sqlClient.storeSettings.findUnique({
				where: { storeId },
				select: { businessHours: true },
			}),
		]);

		if (!store) {
			const { t } = await getT();
			throw new SafeError(t("waitlist_store_not_found") || "Store not found");
		}

		if (!waitListSettings?.enabled) {
			const { t } = await getT();
			throw new SafeError(
				t("waitlist_not_enabled") || "Waitlist is not enabled for this store",
			);
		}

		if (waitListSettings.requireSignIn && !sessionUserId) {
			const { t } = await getT();
			throw new SafeError(
				t("waitlist_sign_in_required") || "Please sign in to join the waitlist",
			);
		}

		if (waitListSettings.requireLineOnly) {
			if (!sessionUserId) {
				const { t } = await getT();
				throw new SafeError(
					t("waitlist_sign_in_required") ||
						"Please sign in to join the waitlist",
				);
			}
			const lineAccount = await sqlClient.account.findFirst({
				where: { userId: sessionUserId, providerId: "line" },
				select: { id: true },
			});
			if (!lineAccount) {
				const { t } = await getT();
				throw new SafeError(
					t("waitlist_line_required") ||
						"Please link your LINE account to join the waitlist.",
				);
			}
		}

		const customerId = inputCustomerId ?? sessionUserId ?? null;
		let name =
			inputName !== undefined && inputName !== null
				? String(inputName).trim() || null
				: null;
		const lastName =
			inputLastName !== undefined && inputLastName !== null
				? String(inputLastName).trim() || null
				: null;
		let phone: string | null = inputPhone?.trim() || null;

		if (waitListSettings.requireSignIn && customerId) {
			const user = await sqlClient.user.findUnique({
				where: { id: customerId },
				select: { name: true, phoneNumber: true },
			});
			if (user) {
				if (!name) {
					name = user.name?.trim() || null;
				}
				phone = phone || user.phoneNumber || null;
			}
		}

		if (waitListSettings.requireName) {
			const { t } = await getT();
			if (!name?.trim()) {
				throw new SafeError(t("waitlist_name_required") || "Name is required");
			}
		}

		if (waitListSettings.requirePhone) {
			const { t } = await getT();
			const p = (phone ?? "").trim();
			if (!p || !validatePhoneNumber(p)) {
				throw new SafeError(
					t("waitlist_phone_required") || "Phone number is required",
				);
			}
		}

		if (customerId) {
			const blacklisted = await sqlClient.rsvpBlacklist.findFirst({
				where: { storeId, userId: customerId },
				select: { id: true },
			});
			if (blacklisted) {
				const { t } = await getT();
				throw new SafeError(
					t("waitlist_blacklisted") || "You cannot join the waitlist",
				);
			}
		}

		const storeTimezone = store.defaultTimezone || "Asia/Taipei";
		const joinResolved = resolveWaitlistJoinEligibility({
			businessHoursJson: storeSettings?.businessHours ?? null,
			useBusinessHours: store.useBusinessHours,
			defaultTimezone: storeTimezone,
			canGetNumBefore: waitListSettings.canGetNumBefore ?? 0,
		});
		if (!joinResolved.ok) {
			const { t } = await getT();
			throw new SafeError(
				t("waitlist_closed_now") ||
					"The waitlist is closed outside business hours.",
			);
		}
		const sessionBlock = joinResolved.sessionBlock;

		const { start: dayStart, end: dayEnd } =
			getStoreTodayStartEndEpoch(storeTimezone);

		const lastEntry = await sqlClient.waitList.findFirst({
			where: {
				storeId,
				sessionBlock,
				createdAt: { gte: dayStart, lt: dayEnd },
			},
			orderBy: { queueNumber: "desc" },
			select: { queueNumber: true },
		});
		const queueNumber = (lastEntry?.queueNumber ?? 0) + 1;

		let verificationCode: string | null = null;
		for (let i = 0; i < MAX_VERIFICATION_CODE_ATTEMPTS; i++) {
			const code = generateVerificationCode();
			const existing = await sqlClient.waitList.findFirst({
				where: { verificationCode: code },
				select: { id: true },
			});
			if (!existing) {
				verificationCode = code;
				break;
			}
		}
		if (!verificationCode) {
			const { t } = await getT();
			throw new SafeError(
				t("waitlist_verification_code_failed") ||
					"Could not generate verification code. Please try again.",
			);
		}

		const now = getUtcNowEpoch();
		const entry = await sqlClient.waitList.create({
			data: {
				storeId,
				queueNumber,
				sessionBlock,
				verificationCode,
				numOfAdult,
				numOfChild,
				customerId,
				name,
				lastName,
				phone,
				message: null,
				status: WaitListStatus.waiting,
				createdAt: now,
				updatedAt: now,
			},
		});

		const transformed = { ...entry } as WaitList;
		transformPrismaDataForJson(transformed);
		return { entry: transformed };
	});
