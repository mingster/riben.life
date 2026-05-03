import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { Suspense } from "react";
import { CronManagementClient } from "./components/cron-management-client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/** SysAdmin — trigger cron API routes and copy recommended crontab lines. */
export default async function SysAdminCronPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<CronManagementClient />
			</Container>
		</Suspense>
	);
}
