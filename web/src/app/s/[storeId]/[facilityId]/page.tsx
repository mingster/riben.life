import { notFound, redirect } from "next/navigation";

import { sqlClient } from "@/lib/prismadb";

type Params = Promise<{ storeId: string; facilityId: string }>;

/** Table / facility QR: middleware sets store + facility cookies; continue to shop. */
export default async function StoreFacilityQrPage(props: { params: Params }) {
	const { storeId, facilityId } = await props.params;
	const facility = await sqlClient.storeFacility.findFirst({
		where: { id: facilityId, storeId },
		select: { id: true },
	});
	if (!facility) {
		notFound();
	}
	redirect(`/shop/${storeId}`);
}
