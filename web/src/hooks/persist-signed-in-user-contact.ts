"use client";

import { updateUserContactAction } from "@/actions/user/update-user-contact";
import type { UpdateUserContactInput } from "@/actions/user/update-user-contact.validation";
import { phoneNumbersEqual, validatePhoneNumber } from "@/utils/phone-utils";

export type PersistContactUserShape = {
	id: string;
	name?: string | null;
	phoneNumber?: string | null;
};

/**
 * After a reservation, persist name/phone to the signed-in user when values changed.
 * Skips guest (anonymous-plugin) sessions; server enforces the same.
 */
export async function persistSignedInUserContactIfChanged(params: {
	user: PersistContactUserShape | null | undefined;
	submittedName?: string | null | undefined;
	submittedPhone?: string | null | undefined;
}): Promise<{ ok: boolean; patched: boolean; serverError?: string }> {
	const { user, submittedName, submittedPhone } = params;
	if (!user?.id) {
		return { ok: true, patched: false };
	}

	const patch: UpdateUserContactInput = {};
	const nameTrim =
		typeof submittedName === "string" ? submittedName.trim() : "";
	if (nameTrim && nameTrim.toLowerCase() !== "anonymous") {
		if (nameTrim !== (user.name ?? "").trim()) {
			patch.name = nameTrim;
		}
	}

	const phoneTrim =
		typeof submittedPhone === "string" ? submittedPhone.trim() : "";
	if (
		phoneTrim &&
		validatePhoneNumber(phoneTrim) &&
		!phoneNumbersEqual(phoneTrim, user.phoneNumber)
	) {
		patch.phone = phoneTrim;
	}

	if (Object.keys(patch).length === 0) {
		return { ok: true, patched: false };
	}

	const result = await updateUserContactAction(patch);
	if (result?.serverError) {
		return { ok: false, patched: false, serverError: result.serverError };
	}
	return { ok: true, patched: true };
}
