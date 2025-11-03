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

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreFaqHomePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Parallel queries for optimal performance
	const [store, faqCategories] = await Promise.all([
		sqlClient.store.findFirst({
			where: { id: params.storeId },
			select: {
				id: true,
				name: true,
				isOpen: true,
			},
		}),
		sqlClient.faqCategory.findMany({
			where: { storeId: params.storeId },
			include: {
				FAQ: {
					orderBy: { sortOrder: "asc" },
				},
			},
			orderBy: {
				sortOrder: "asc",
			},
		}),
	]);

	if (!store) {
		redirect("/unv");
	}

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
