import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import { sqlClient } from "@/lib/prismadb";
import { checkStoreAccess } from "@/lib/store-admin-utils";
import type { Faq } from "@/types";
import type { Store } from "@prisma/client";
import { Suspense } from "react";
import type { FaqColumn } from "./components/columns";
import { FaqClient } from "./components/faq-client";

//!SECTION here we list FAQs under the given faq category.
//

type Params = Promise<{ storeId: string; categoryId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function FaqPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;
	const _store = (await checkStoreAccess(params.storeId)) as Store;

	//SECTION disallow access if category is not found
	const category = await sqlClient.faqCategory.findUnique({
		where: {
			id: params.categoryId,
		},
		include: {
			//FAQ: true, // Include the FAQ property
		},
	});

	if (category === null) return;

	const faqs = await sqlClient.faq.findMany({
		where: {
			categoryId: params.categoryId,
		},
		include: {
			FaqCategory: true,
		},
		orderBy: {
			sortOrder: "asc",
		},
	});

	// map FAQ to ui
	const formattedFaq: FaqColumn[] = faqs.map((item: Faq) => ({
		id: item.id,
		categoryId: item.categoryId,
		category: item.FaqCategory.name,
		question: item.question,
		sortOrder: item.sortOrder,
	}));

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<FaqClient data={formattedFaq} category={category} />
			</Container>
		</Suspense>
	);
}
