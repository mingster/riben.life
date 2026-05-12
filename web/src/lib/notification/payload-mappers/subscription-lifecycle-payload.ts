import type { User } from "@/types";
import { getBaseUrlForMail } from "@/lib/notification/email-template";

export interface SubscriptionLifecyclePayloadInput {
	user: User;
	storeId: string;
	storeName?: string | null;
	subscriptionUrl?: string | null;
	platformName?: string | null;
}

function buildDefaultSubscriptionUrl(
	storeId: string | null | undefined,
): string {
	if (!storeId) {
		return "";
	}

	const base = getBaseUrlForMail().replace(/\/$/, "");
	return `${base}/storeAdmin/${encodeURIComponent(storeId)}/subscribe`;
}

export function buildSubscriptionLifecyclePayload(
	input: SubscriptionLifecyclePayloadInput,
): Record<string, unknown> {
	return {
		customer: {
			id: input.user.id ?? "",
			name: input.user.name ?? "",
			email: input.user.email ?? "",
			phone: input.user.phoneNumber ?? "",
		},
		store: {
			id: input.storeId,
			name: input.storeName ?? "",
		},
		subscription: {
			url: input.subscriptionUrl ?? buildDefaultSubscriptionUrl(input.storeId),
		},
		platform: {
			name: input.platformName ?? "",
		},
	};
}
