import Container from "@/components/ui/container";
import { SystemLogClient } from "./client-syslog";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// System Log viewer - displays application logs
export default async function SystemLogAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	return (
		<Container>
			<SystemLogClient />
		</Container>
	);
}
