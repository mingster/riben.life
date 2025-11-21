import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import type { FaqCategory } from "@/types";
import type { FaqCategoryColumn } from "./components/columns";
import { FaqCategoryClient } from "./components/faqCategory-client";
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function FaqCategoryPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	const categories = await sqlClient.faqCategory.findMany({
		where: { storeId: params.storeId },
		include: {
			_count: {
				select: { FAQ: true },
			},
		},
		orderBy: { sortOrder: "asc" },
	});

	// Map FAQ Category to UI columns
	const formattedCategories: FaqCategoryColumn[] = categories.map((item) => ({
		faqCategoryId: item.id,
		storeId: params.storeId,
		name: item.name,
		sortOrder: Number(item.sortOrder) || 0,
		faqCount: item._count.FAQ,
	}));

	return (
		<Container>
			<FaqCategoryClient data={formattedCategories} />
		</Container>
	);
}
