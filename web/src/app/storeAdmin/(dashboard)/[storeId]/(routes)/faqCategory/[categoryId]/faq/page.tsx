import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import type { Faq } from "@/types";
import type { FaqColumn } from "./components/columns";
import { FaqClient } from "./components/faq-client";

// FAQ management page for a specific category

type Params = Promise<{ storeId: string; categoryId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function FaqPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	// Parallel queries for optimal performance
	const [category, faqs] = await Promise.all([
		sqlClient.faqCategory.findUnique({
			where: { id: params.categoryId },
		}),
		sqlClient.faq.findMany({
			where: { categoryId: params.categoryId },
			include: {
				FaqCategory: true,
			},
			orderBy: { sortOrder: "asc" },
		}),
	]);

	if (category === null) return null;

	// Map FAQ to UI columns
	const formattedFaq: FaqColumn[] = (faqs as Faq[]).map((item) => ({
		id: item.id,
		categoryId: item.categoryId,
		category: item.FaqCategory.name,
		question: item.question,
		sortOrder: item.sortOrder,
	}));

	return (
		<Container>
			<FaqClient data={formattedFaq} category={category} />
		</Container>
	);
}
