import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { Suspense } from "react";
import { SystemLogClient } from "./client-syslog";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// System Log viewer - displays application logs
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
