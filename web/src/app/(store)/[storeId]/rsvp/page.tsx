import Container from "@/components/ui/container";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function RsvpPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	return (
		<Container>
			<div>Rsvp - Coming Soon</div>
		</Container>
	);
}
