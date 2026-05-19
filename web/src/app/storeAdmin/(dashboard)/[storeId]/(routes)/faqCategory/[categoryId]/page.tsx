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
			FAQ: true,
			locales: true,
		},
	});

	const store = await sqlClient.store.findUnique({
		where: { id: params.storeId },
		select: { defaultLocale: true, supportedLocales: true },
	});

	const allLocales = await sqlClient.locale.findMany({
		where: store?.supportedLocales?.length
			? { id: { in: store.supportedLocales } }
			: undefined,
		orderBy: { lng: "asc" },
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
					allLocales={allLocales}
				/>
			</div>
		</div>
	);
}
