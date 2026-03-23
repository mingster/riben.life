import Container from "@/components/ui/container";
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";
import { SettingGoogleCalendarTab } from "../setting-google-calendar-tab";
import { Suspense } from "react";
import { Loader } from "@/components/loader";

type Params = Promise<{ storeId: string }>;

export default async function GoogleCalendarSettingsPage(props: {
	params: Params;
}) {
	const params = await props.params;
	await checkStoreStaffAccess(params.storeId);

	return (
		<Container>
			<Suspense fallback={<Loader />}>
				<SettingGoogleCalendarTab />
			</Suspense>
		</Container>
	);
}
