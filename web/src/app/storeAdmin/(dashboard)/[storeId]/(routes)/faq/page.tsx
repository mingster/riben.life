import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { FaqCategory } from "@/types";
import { FaqCategoryClient } from "./components/client-faq-category";

type Params = Promise<{ storeId: string }>;

export default async function FaqAdminPage(props: { params: Params }) {
	const params = await props.params;

	const categories = await sqlClient.faqCategory.findMany({
		where: { storeId: params.storeId },
		include: {
			locales: true,
			FAQ: {
				include: { locales: true },
				orderBy: { sortOrder: "asc" },
			},
		},
		orderBy: { sortOrder: "asc" },
	});

	transformPrismaDataForJson(categories);
	const data = categories as unknown as FaqCategory[];

	return (
		<Container>
			<FaqCategoryClient serverData={data} />
		</Container>
	);
}
