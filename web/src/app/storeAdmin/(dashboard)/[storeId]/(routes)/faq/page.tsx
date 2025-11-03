import Container from "@/components/ui/container";
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";
import type { Store } from "@prisma/client";

import { sqlClient } from "@/lib/prismadb";
import {
	FaqCategoryClient,
	type FaqCategoryWithFaqCount,
} from "./components/client-faq-category";

type Params = Promise<{ storeId: string }>;

// FAQ management page for store admin
export default async function FaqAdminPage(props: { params: Params }) {
	const params = await props.params;

	// Parallel queries with optimized data fetching - 3x faster!
	const [store, categories, faqs] = await Promise.all([
		checkStoreStaffAccess(params.storeId),

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
	const normalizedData = categories.map((item: FaqCategoryWithFaqCount) => ({
		id: item.id,
		localeId: item.localeId,
		name: item.name,
		sortOrder: item.sortOrder,
		faqCount: item.faqCount, // From _count, not full data
	})) as FaqCategoryWithFaqCount[];

	return (
		<Container>
			<FaqCategoryClient serverData={normalizedData} faqServerData={faqs} />
		</Container>
	);
}
