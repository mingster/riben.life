import { sqlClient } from "@/lib/prismadb";
import { FaqCategoryEdit } from "./faqCategory-edit";

type Params = Promise<{ storeId: string; categoryId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function FaqCategoryEditPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	const obj = await sqlClient.faqCategory.findUnique({
		where: {
			id: params.categoryId,
		},
		include: {
			FAQ: true, // Include the FAQ property
		},
	});

	const store = await sqlClient.store.findUnique({
		where: { id: params.storeId },
		select: { defaultLocale: true },
	});
	const locale = await sqlClient.locale.findFirst({
		where: { lng: store?.defaultLocale ?? "tw" },
	});
	const defaultLocaleId = locale?.id ?? "zh-TW";

	let action = "Edit";
	if (obj === null) action = "Create";

	return (
		<div className="flex-col">
			<div className="flex-1 space-y-4 p-8 pt-6">
				<FaqCategoryEdit
					initialData={obj}
					action={action}
					defaultLocaleId={defaultLocaleId}
				/>
			</div>
		</div>
	);
}
