import { notFound } from "next/navigation";

import { sqlClient } from "@/lib/prismadb";
import { isReservedRoute } from "@/lib/reserved-routes";
import { isValidGuid } from "@/utils/guid-utils";

import { LiffPhase0Status } from "../components/liff-phase0-status";

type Params = Promise<{ storeId: string }>;

/**
 * Store-scoped LIFF smoke route. Re-validates `storeId` on the server; feature pages
 * (waitlist, RSVP, checkout) are added in later phases.
 */
export default async function LiffStoreBootstrapPage(props: {
	params: Params;
}) {
	const { storeId: rawStoreId } = await props.params;
	const storeId = rawStoreId?.trim() ?? "";

	if (!storeId || isReservedRoute(storeId)) {
		notFound();
	}

	const isUuid = isValidGuid(storeId);
	const store = await sqlClient.store.findFirst({
		where: isUuid
			? { id: storeId }
			: { name: { equals: storeId, mode: "insensitive" } },
		select: { id: true, name: true },
	});

	if (!store) {
		notFound();
	}

	return <LiffPhase0Status storeName={store.name} />;
}
