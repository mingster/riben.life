import { Suspense } from "react";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { SystemLogClient } from "./client-syslog";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// this is CRUD for System Message object/table.
//
export default async function SystemLogAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<SystemLogClient />
			</Container>
		</Suspense>
	);
}
