import { notFound } from "next/navigation";

import { sqlClient } from "@/lib/prismadb";

export interface WaitlistPublicWaitListSettingsPick {
	enabled: boolean;
	requireSignIn: boolean;
	requireName: boolean;
	requireLineOnly: boolean;
}

export interface WaitlistPublicPageData {
	storeId: string;
	storeName: string;
	waitListSettings: WaitlistPublicWaitListSettingsPick | null;
}

/**
 * Loads store + waitlist settings for the public waitlist UI.
 * Callers must handle session separately and pass `isSignedIn` / LINE account to the client.
 */
export async function getWaitlistPublicPageData(
	storeId: string,
): Promise<WaitlistPublicPageData> {
	const store = await sqlClient.store.findFirst({
		where: { id: storeId, isDeleted: false },
		select: { id: true, name: true },
	});
	if (!store) {
		notFound();
	}

	const waitListSettings = await sqlClient.waitListSettings.findUnique({
		where: { storeId },
		select: {
			enabled: true,
			requireSignIn: true,
			requireName: true,
			requireLineOnly: true,
		},
	});

	return {
		storeId: store.id,
		storeName: store.name,
		waitListSettings,
	};
}
