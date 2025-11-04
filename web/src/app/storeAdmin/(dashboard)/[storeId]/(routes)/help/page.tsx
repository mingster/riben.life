import Container from "@/components/ui/container";
import { FaqClient } from "./faq-client";

type Params = Promise<{ orderId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function HelpPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	return (
		<Container>
			<FaqClient />
		</Container>
	);
}
