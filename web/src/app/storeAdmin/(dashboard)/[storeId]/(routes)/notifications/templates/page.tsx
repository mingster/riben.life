import { notFound } from "next/navigation";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function NotificationTemplatesPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	await props.params;
	notFound();
}
