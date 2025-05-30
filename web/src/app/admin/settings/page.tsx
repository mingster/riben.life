import Container from "@/components/ui/container";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function SettingsAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const _params = await props.params;

	return <Container>admin Settings</Container>;
}
