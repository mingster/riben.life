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
	});

	if (category === null) {
		return;
	}

	const obj = await sqlClient.faq.findUnique({
		where: {
			id: params.faqId,
		},
		include: {
			FaqCategory: true, // Include the FaqCategory property
		},
	});
	logger.info("Operation log");

	let action = "Edit";
	if (obj === null) action = "Create";

	return (
		<div className="flex-col">
			<div className="flex-1 space-y-4 p-8 pt-6">
				<FaqEdit initialData={obj} category={category} action={action} />
			</div>
		</div>
	);
};

export default FaqEditPage;
