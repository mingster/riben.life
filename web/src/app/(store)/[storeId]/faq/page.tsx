import getUser from "@/actions/get-user";
import { getOptions } from "@/app/i18n/settings";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import Container from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Loader } from "@/components/ui/loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sqlClient } from "@/lib/prismadb";
import type { User } from "@/types";
import { redirect } from "next/navigation";
import { Suspense } from "react";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreFaqHomePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	const store = await sqlClient.store.findFirst({
		where: {
			id: params.storeId,
		},
	});

	if (!store) {
		redirect("/unv");
	}

	const faqCategories = await sqlClient.faqCategory.findMany({
		where: {
			storeId: params.storeId,
		},
		include: {
			FAQ: {
				orderBy: { sortOrder: "asc" },
			},
		},
		orderBy: {
			sortOrder: "asc",
		},
	});

	const _i18Options = getOptions();
	const _user = (await getUser()) as User;

	/*
  const lng = user?.locale?.toString() || i18Options.fallbackLng;
  //console.log(`user language: ${lng}`);
  const { t } = await useTranslation(lng);

          <Heading title={t("FAQ")} description={""} />

  */

	if (faqCategories === null) return;

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<Heading title="常見問題" description={""} />

				<Tabs defaultValue="account" className="">
					<TabsList className="">
						{faqCategories.map((category) => (
							<TabsTrigger
								key={category.id}
								value={category.id}
								className="w-30"
							>
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
											<h1 className="lg:text-2xl text-link"> {faq.question}</h1>
										</AccordionTrigger>
										<AccordionContent>{faq.answer}</AccordionContent>
									</AccordionItem>
								</Accordion>
							))}
						</TabsContent>
					))}
				</Tabs>
			</Container>
		</Suspense>
	);
}
