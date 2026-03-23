import Container from "@/components/ui/container";
import { getStoreWithRelations } from "@/lib/store-access";
import { sqlClient } from "@/lib/prismadb";
import { redirect } from "next/navigation";

import { WaitingListSettingsClient } from "./components/waiting-list-settings-client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function WaitingListSettingsPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	const store = await getStoreWithRelations(params.storeId, {});
	if (!store) {
		redirect("/storeAdmin");
	}

	const rsvpSettings = await sqlClient.rsvpSettings.findFirst({
		where: { storeId: params.storeId },
		select: {
			waitlistEnabled: true,
			waitlistRequireSignIn: true,
			waitlistRequireName: true,
		},
	});

	return (
		<Container>
			<WaitingListSettingsClient
				initialValues={{
					waitlistEnabled: rsvpSettings?.waitlistEnabled ?? false,
					waitlistRequireSignIn: rsvpSettings?.waitlistRequireSignIn ?? false,
					waitlistRequireName: rsvpSettings?.waitlistRequireName ?? false,
				}}
			/>
		</Container>
	);
}
