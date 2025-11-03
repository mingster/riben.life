import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";
import type { FaqCategory } from "@/types";
import type { Store } from "@prisma/client";
import type { FaqCategoryColumn } from "./components/columns";
import { FaqCategoryClient } from "./components/faqCategory-client";
import { FaqCategoryWithFaqCount } from "../faq/components/client-faq-category";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function FaqCategoryPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Parallel queries with optimized data fetching
	const [store, categories] = await Promise.all([
		checkStoreStaffAccess(params.storeId),
		sqlClient.faqCategory.findMany({
			where: { storeId: params.storeId },
			include: {
				_count: {
					select: { FAQ: true },
				},
			},
			orderBy: { sortOrder: "asc" },
		}),
	]);

	// Map FAQ Category to UI columns
	const formattedCategories: FaqCategoryColumn[] = categories.map(
		(item: FaqCategoryWithFaqCount) => ({
			faqCategoryId: item.id,
			storeId: store.id,
			name: item.name,
			sortOrder: Number(item.sortOrder) || 0,
			faqCount: item.faqCount,
		}),
	);

	return (
		<Container>
			<FaqCategoryClient data={formattedCategories} />
		</Container>
	);
}
