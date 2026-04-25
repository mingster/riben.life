"use server";

import { updateUserContactSchema } from "@/actions/user/update-user-contact.validation";
import { getT } from "@/app/i18n";
import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { userRequiredActionClient } from "@/utils/actions/safe-action";
import { SafeError } from "@/utils/error";
import { headers } from "next/headers";

export const updateUserContactAction = userRequiredActionClient
	.metadata({ name: "updateUserContact" })
	.schema(updateUserContactSchema)
	.action(async ({ ctx: { userId }, parsedInput }) => {
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		const email = session?.user?.email ?? "";
		const isGuestSession =
			email.startsWith("guest-") && email.endsWith("@riben.life");
		if (isGuestSession) {
			const { t } = await getT();
			throw new SafeError(
				t("rsvp_please_sign_in") || "Please sign in with a full account.",
			);
		}

		const { t } = await getT();
		const data: { name?: string; phoneNumber?: string } = {};

		if (parsedInput.name !== undefined) {
			const trimmed = parsedInput.name.trim();
			if (!trimmed || trimmed.toLowerCase() === "anonymous") {
				throw new SafeError(
					t("rsvp_name_required") || t("rsvp_name_required_for_anonymous"),
				);
			}
			data.name = trimmed;
		}

		/*
		if (parsedInput.phone !== undefined) {
			const trimmed = parsedInput.phone.trim();
			if (!trimmed) {
				throw new SafeError(
					t("rsvp_phone_required") ||
						t("phone_number_required") ||
						"Phone is required",
				);
			}
			if (!validatePhoneNumber(trimmed)) {
				throw new SafeError(
					t("phone_number_invalid_format") || "Invalid phone number",
				);
			}
			data.phoneNumber = normalizePhoneNumber(trimmed);
		}
      */

		if (Object.keys(data).length === 0) {
			return sqlClient.user.findUnique({
				where: { id: userId },
			});
		}

		return sqlClient.user.update({
			where: { id: userId },
			data,
		});
	});
