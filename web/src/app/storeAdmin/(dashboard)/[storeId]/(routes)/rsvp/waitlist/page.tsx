import Container from "@/components/ui/container";
import { getStoreWithRelations } from "@/lib/store-access";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { redirect } from "next/navigation";
import { WaitlistAdminClient } from "./components/waitlist-admin-client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function WaitlistAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;
	const storeResult = await getStoreWithRelations(params.storeId, {});
	if (!storeResult) redirect("/storeAdmin");

	const [rsvpSettings, facilities, storeTz] = await Promise.all([
		sqlClient.rsvpSettings.findFirst({
			where: { storeId: params.storeId },
			select: { waitlistEnabled: true },
		}),
		sqlClient.storeFacility.findMany({
			where: { storeId: params.storeId },
			orderBy: { facilityName: "asc" },
			select: { id: true, facilityName: true },
		}),
		sqlClient.store.findUnique({
			where: { id: params.storeId },
			select: { defaultTimezone: true },
		}),
	]);

	transformPrismaDataForJson(facilities);

	return (
		<Container>
			<WaitlistAdminClient
				storeId={params.storeId}
				waitlistEnabled={rsvpSettings?.waitlistEnabled ?? false}
				facilities={facilities}
				storeTimezone={storeTz?.defaultTimezone ?? "Asia/Taipei"}
			/>
		</Container>
	);
}
