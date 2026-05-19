import { sqlClient } from "@/lib/prismadb";
import { FaqEdit } from "./faq-edit";
import logger from "@/lib/logger";

const FaqEditPage = async (props: {
	params: Promise<{ storeId: string; categoryId: string; faqId: string }>;
}) => {
	const params = await props.params;
	// make sure category exists
	const category = await sqlClient.faqCategory.findUnique({
		where: {
			id: params.categoryId,
		},
		include: { locales: true },
	});

	if (category === null) {
		return;
	}

	const store = await sqlClient.store.findUnique({
		where: { id: params.storeId },
		select: { supportedLocales: true, defaultLocale: true },
	});

	const [allLocales, allCategories, obj] = await Promise.all([
		sqlClient.locale.findMany({
			where: store?.supportedLocales?.length
				? { id: { in: store.supportedLocales } }
				: undefined,
		}),
		sqlClient.faqCategory.findMany({
			where: { storeId: params.storeId },
			include: { locales: true },
			orderBy: { sortOrder: "asc" },
		}),
		params.faqId === "new"
			? Promise.resolve(null)
			: sqlClient.faq.findUnique({
					where: { id: params.faqId },
					include: { locales: true },
				}),
	]);
	logger.info("Operation log");

	const action = obj === null ? "Create" : "Edit";
	const defaultLocaleId =
		allLocales.find((l) => l.lng === (store?.defaultLocale ?? "tw"))?.id ?? "";

	return (
		<div className="flex-col">
			<div className="flex-1 space-y-4 p-8 pt-6">
				<FaqEdit
					initialData={obj}
					category={category}
					action={action}
					allLocales={allLocales}
					allCategories={allCategories}
					defaultLocaleId={defaultLocaleId}
				/>
			</div>
		</div>
	);
};

export default FaqEditPage;
