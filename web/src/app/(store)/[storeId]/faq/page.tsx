import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import Container from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sqlClient } from "@/lib/prismadb";
import { redirect } from "next/navigation";
import { isValidGuid } from "@/utils/guid-utils";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreFaqHomePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Find store by ID (UUID) or name
	// Try ID first if it looks like a UUID, otherwise try name
	const isUuid = isValidGuid(params.storeId);
	const store = await sqlClient.store.findFirst({
		where: isUuid
			? { id: params.storeId }
			: { name: { equals: params.storeId, mode: "insensitive" } },
		select: {
			id: true,
			name: true,
			isOpen: true,
		},
	});

	if (!store) {
		redirect("/unv");
	}

	// Use the actual store ID for subsequent queries (in case we found by name)
	const actualStoreId = store.id;
	const faqCategories = await sqlClient.faqCategory.findMany({
		where: { storeId: actualStoreId },
		include: {
			FAQ: {
				orderBy: { sortOrder: "asc" },
			},
		},
		orderBy: {
			sortOrder: "asc",
		},
	});

	if (!faqCategories || faqCategories.length === 0) {
		return (
			<Container>
				<section className="py-4 px-3 sm:py-8 sm:px-4 md:py-12">
					<Heading title="常見問題" description="" />
					<p className="text-sm sm:text-base">No FAQ available yet.</p>
				</section>
			</Container>
		);
	}

	return (
		<Container>
			<section className="py-4 px-3 sm:py-8 sm:px-4 md:py-12">
				<Heading title="常見問題" description="" />

				<Tabs defaultValue={faqCategories[0]?.id} className="w-full">
					<div className="overflow-x-auto -mx-3 sm:mx-0">
						<TabsList className="w-full min-w-fit sm:w-auto inline-flex h-10 min-h-[44px] sm:h-9 sm:min-h-0 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground gap-1 sm:gap-2">
							{faqCategories.map((category) => (
								<TabsTrigger
									key={category.id}
									value={category.id}
									className="h-9 min-h-[44px] sm:min-h-0 px-3 sm:px-4 text-xs sm:text-sm touch-manipulation whitespace-nowrap"
								>
									{category.name}
								</TabsTrigger>
							))}
						</TabsList>
					</div>
					{faqCategories.map((category) => (
						<TabsContent
							key={category.id}
							value={category.id}
							className="mt-4 sm:mt-6"
						>
							<div className="space-y-2 sm:space-y-3">
								{category.FAQ.map((faq) => (
									<Accordion key={faq.id} type="single" collapsible>
										<AccordionItem value={faq.id}>
											<AccordionTrigger className="text-left min-h-[44px] sm:min-h-0 py-3 sm:py-4 px-3 sm:px-4 touch-manipulation">
												<h2 className="text-sm sm:text-base lg:text-xl text-link font-semibold pr-4">
													{faq.question}
												</h2>
											</AccordionTrigger>
											<AccordionContent className="px-3 sm:px-4 pb-3 sm:pb-4">
												<div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-p:text-sm sm:prose-p:text-base prose-p:leading-relaxed prose-ul:text-sm sm:prose-ul:text-base prose-ol:text-sm sm:prose-ol:text-base prose-li:text-sm sm:prose-li:text-base">
													{faq.answer}
												</div>
											</AccordionContent>
										</AccordionItem>
									</Accordion>
								))}
							</div>
						</TabsContent>
					))}
				</Tabs>
			</section>
		</Container>
	);
}
