import Container from "@/components/ui/container";
import { isPro } from "@/lib/store-admin-utils";
import { getStoreWithRelations } from "@/lib/store-access";
import { Store } from "@/types";
import { RsvpSettingTabs } from "./components/tabs";

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
	const [store, isProLevel] = await Promise.all([
		getStoreWithRelations(params.storeId, {}) as Store,

		isPro(params.storeId),
	]);

	return (
		<Container>
			<RsvpSettingTabs store={store as Store} />
		</Container>
	);
}
