//import type { FaqCategory } from "@/../.prisma/client";
import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";
import type { Store } from "@prisma/client";

import { sqlClient } from "@/lib/prismadb";
import { Suspense } from "react";
import {
	FaqCategoryClient,
	type FaqCategoryWithFaqCount,
} from "./components/client-faq-category";

type Params = Promise<{ storeId: string }>;
//type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

//const customRevalidateTag = (tag: string) => {
//	revalidateTag(tag);
//};

// this is CRUD for System Message object/table.
//
export default async function FaqAdminPage(props: {
	params: Params;
	//searchParams: SearchParams;
}) {
	const params = await props.params;
	const store = (await checkStoreStaffAccess(params.storeId)) as Store;

	// get FAQ categories and its FAQ count only
	const categories = await sqlClient.faqCategory.findMany({
		where: {
			storeId: store.id,
		},
		include: {
			FAQ: true,
		},
		orderBy: {
			sortOrder: "asc",
		},
	});

	//normalize FAQ categories, stripe off FAQ content, just count only
	const normalizedData = categories.map((item) => ({
		id: item.id,
		localeId: item.localeId,
		name: item.name,
		sortOrder: item.sortOrder,
		faqCount: item.FAQ.length,
	})) as FaqCategoryWithFaqCount[];

	const faqs = await sqlClient.faq.findMany({
		include: {
			FaqCategory: true,
		},
		orderBy: {
			sortOrder: "asc",
		},
	});

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<FaqCategoryClient serverData={normalizedData} faqServerData={faqs} />
			</Container>
		</Suspense>
	);
}
