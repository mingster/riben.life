import Container from "@/components/ui/container";
import { isPro } from "@/lib/store-admin-utils";
import { getStoreWithRelations } from "@/lib/store-access";
import { Store } from "@/types";
import { RsvpSettingTabs } from "./components/tabs";
import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/utils/utils";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

//https://tinybook.cc/spacebooking/
export default async function RsvpSettingsPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	// Parallel queries for optimal performance
	const [store, isProLevel, rsvpSettings] = await Promise.all([
		getStoreWithRelations(params.storeId, {}) as Store,
		isPro(params.storeId),
		sqlClient.rsvpSettings.findFirst({
			where: { storeId: params.storeId },
		}),
	]);

	if (rsvpSettings) {
		transformDecimalsToNumbers(rsvpSettings);
	}

	return (
		<Container>
			<RsvpSettingTabs store={store as Store} rsvpSettings={rsvpSettings} />
		</Container>
	);
}
