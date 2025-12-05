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
				<Heading title="常見問題" description="" />
				<p>No FAQ available yet.</p>
			</Container>
		);
	}

	return (
		<Container>
			<Heading title="常見問題" description="" />

			<Tabs defaultValue={faqCategories[0]?.id} className="">
				<TabsList className="">
					{faqCategories.map((category) => (
						<TabsTrigger key={category.id} value={category.id} className="w-30">
							{category.name}
						</TabsTrigger>
					))}
				</TabsList>
				{faqCategories.map((category) => (
					<TabsContent key={category.id} value={category.id}>
						{category.FAQ.map((faq) => (
							<Accordion key={faq.id} type="single" collapsible>
								<AccordionItem value={faq.id}>
									<AccordionTrigger className="w-30">
										<h1 className="lg:text-2xl text-link">{faq.question}</h1>
									</AccordionTrigger>
									<AccordionContent>{faq.answer}</AccordionContent>
								</AccordionItem>
							</Accordion>
						))}
					</TabsContent>
				))}
			</Tabs>
		</Container>
	);
}
