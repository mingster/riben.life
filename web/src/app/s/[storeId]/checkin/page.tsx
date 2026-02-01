import { sqlClient } from "@/lib/prismadb";
import { isValidGuid } from "@/utils/guid-utils";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loader } from "@/components/loader";
import { CheckinClient } from "./components/checkin-client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function CheckinPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const rsvpIdRaw = searchParams.rsvpId;
	const rsvpId =
		typeof rsvpIdRaw === "string"
			? rsvpIdRaw
			: Array.isArray(rsvpIdRaw)
				? rsvpIdRaw[0]
				: undefined;

	const isUuid = isValidGuid(params.storeId);
	const store = await sqlClient.store.findFirst({
		where: isUuid
			? { id: params.storeId }
			: { name: { equals: params.storeId, mode: "insensitive" } },
		select: { id: true, name: true },
	});

	if (!store) {
		redirect("/unv");
	}

	return (
		<Suspense fallback={<Loader />}>
			<CheckinClient
				storeId={store.id}
				storeName={store.name}
				initialRsvpId={rsvpId ?? null}
			/>
		</Suspense>
	);
}
