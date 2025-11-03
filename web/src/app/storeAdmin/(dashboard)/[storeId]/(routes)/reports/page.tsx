import Container from "@/components/ui/container";
import { checkStoreStaffAccess, isPro } from "@/lib/store-admin-utils";
import type { Store } from "@prisma/client";

type Params = Promise<{ storeId: string; messageId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ReportsPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Parallel queries for optimal performance
	const [store, hasProLevel] = await Promise.all([
		checkStoreStaffAccess(params.storeId),
		isPro(params.storeId),
	]);

	return (
		<Container>
			<div>Reports - Coming Soon</div>
		</Container>
	);
}
