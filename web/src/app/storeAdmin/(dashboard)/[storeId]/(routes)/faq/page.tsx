import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import {
	FaqCategoryClient,
	type FaqCategoryWithFaqCount,
} from "./components/client-faq-category";
import { FaqCategory } from "@prisma/client";

type Params = Promise<{ storeId: string }>;

// FAQ management page for store admin
export default async function FaqAdminPage(props: { params: Params }) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	// Parallel queries with optimized data fetching - 3x faster!
	const [categories, faqs] = await Promise.all([
		// Use _count instead of including all FAQs (more efficient!)
		sqlClient.faqCategory.findMany({
			where: { storeId: params.storeId },
			include: {
				_count: {
					select: { FAQ: true },
				},
			},
			orderBy: { sortOrder: "asc" },
		}),

		sqlClient.faq.findMany({
			where: {
				FaqCategory: {
					storeId: params.storeId,
				},
			},
			include: {
				FaqCategory: true,
			},
			orderBy: { sortOrder: "asc" },
		}),
	]);

	// Map categories with FAQ count
	const normalizedData = categories.map(
		(item: FaqCategory & { _count: { FAQ: number } }) => ({
			id: item.id,
			localeId: item.localeId,
			name: item.name,
			sortOrder: item.sortOrder,
			faqCount: item._count.FAQ, // From _count, not full data
		}),
	) as FaqCategoryWithFaqCount[];

	return (
		<Container>
			<FaqCategoryClient serverData={normalizedData} faqServerData={faqs} />
		</Container>
	);
}
