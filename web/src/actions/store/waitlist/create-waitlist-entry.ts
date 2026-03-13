"use server";

import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { baseClient } from "@/utils/actions/safe-action";
import {
	getUtcNowEpoch,
	getStoreTodayStartEndEpoch,
} from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { headers } from "next/headers";
import { getT } from "@/app/i18n";
import { createWaitlistEntrySchema } from "./create-waitlist-entry.validation";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { WaitList } from "@prisma/client";

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
		} = parsedInput;

		const session = await auth.api.getSession({
			headers: await headers(),
		});
		const sessionUserId = session?.user?.id;

		const [store, rsvpSettings] = await Promise.all([
			sqlClient.store.findUnique({
				where: { id: storeId },
				select: {
					id: true,
					name: true,
					defaultTimezone: true,
				},
			}),
			sqlClient.rsvpSettings.findFirst({
				where: { storeId },
				select: {
					waitlistEnabled: true,
					waitlistRequireSignIn: true,
				},
			}),
		]);

		if (!store) {
			const { t } = await getT();
			throw new SafeError(t("waitlist_store_not_found") || "Store not found");
		}

		if (!rsvpSettings?.waitlistEnabled) {
			const { t } = await getT();
			throw new SafeError(
				t("waitlist_not_enabled") || "Waitlist is not enabled for this store",
			);
		}

		if (rsvpSettings.waitlistRequireSignIn && !sessionUserId) {
			const { t } = await getT();
			throw new SafeError(
				t("waitlist_sign_in_required") || "Please sign in to join the waitlist",
			);
		}

		const customerId = inputCustomerId ?? sessionUserId ?? null;
		let name: string | null = null;
		let phone: string | null = inputPhone?.trim() || null;

		if (rsvpSettings.waitlistRequireSignIn && customerId) {
			const user = await sqlClient.user.findUnique({
				where: { id: customerId },
				select: { name: true, phoneNumber: true },
			});
			if (user) {
				name = user.name || null;
				phone = phone || user.phoneNumber || null;
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
		const { start: dayStart, end: dayEnd } =
			getStoreTodayStartEndEpoch(storeTimezone);

		const lastEntry = await sqlClient.waitList.findFirst({
			where: {
				storeId,
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
				verificationCode,
				numOfAdult,
				numOfChild,
				customerId,
				name,
				lastName: null,
				phone,
				message: null,
				status: "waiting",
				createdAt: now,
				updatedAt: now,
			},
		});

		const transformed = { ...entry } as WaitList;
		transformPrismaDataForJson(transformed);
		return { entry: transformed };
	});
