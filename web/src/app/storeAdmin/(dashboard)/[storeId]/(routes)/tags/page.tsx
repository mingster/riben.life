import Container from "@/components/ui/container";

type Params = Promise<{ orderId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function TagsMgmtPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const _params = await props.params;

	return <Container>Store Tags</Container>;
}
