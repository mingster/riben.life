"use client";

import { ClipLoader } from "react-spinners";
import useSWR from "swr";
import { useMemo, useCallback } from "react";
import { useTranslation } from "@/app/i18n/client";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/providers/i18n-provider";
import type { Faq, FaqCategory } from "@/types";
import DisplayMarkDown from "../display-mark-down";
import { Card, CardContent } from "../ui/card";
import { Heading } from "../heading";
import { clientLogger } from "@/lib/client-logger";

// Constants
const REFRESH_INTERVAL = 300000; // 5 minutes
const ERROR_RETRY_COUNT = 3;
const ERROR_RETRY_INTERVAL = 5000;

// Types
interface QuestionProps {
	className?: string;
	children: React.ReactNode;
}

interface AnswerProps {
	as?: React.ElementType;
	className?: string;
	children: React.ReactNode;
}

interface FAQItemProps {
	faq: Faq;
}

interface FAQCategoryProps {
	category: FaqCategory;
}

// Memoized FAQ item component
const FAQItem = ({ faq }: FAQItemProps) => {
	return (
		<Accordion key={faq.id} type="single" collapsible>
			<AccordionItem value={faq.id}>
				<AccordionTrigger
					className="w-30 hover:no-underline"
					aria-label={`Toggle ${faq.question}`}
				>
					<Question>{faq.question}</Question>
				</AccordionTrigger>
				<AccordionContent>
					<Answer>
						<DisplayMarkDown content={faq.answer} />
					</Answer>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
};

// Memoized FAQ category component
const FAQCategory = ({ category }: FAQCategoryProps) => {
	return (
		<TabsContent key={category.id} value={category.id}>
			<Card>
				<CardContent className="p-6">
					<div className="space-y-4">
						{category.FAQ.map((faq: Faq) => (
							<FAQItem key={faq.id} faq={faq} />
						))}
					</div>
				</CardContent>
			</Card>
		</TabsContent>
	);
};

export function Question({
	className = "",
	children,
	...props
}: QuestionProps) {
	return (
		<div
			className={`mt-1 text-gold lg:text-xl font-bold sm:text-lg
				hover:no-underline hover:backdrop-contrast-200 hover:font-extrabold transition-all duration-200 ${className}`}
			{...props}
		>
			{children}
		</div>
	);
}

export function Answer({
	as: Component = "div",
	className = "",
	children,
	...props
}: AnswerProps) {
	return (
		<Component className={`mt-1 space-y-2 font-sans ${className}`} {...props}>
			{children}
		</Component>
	);
}

export const FAQ: React.FC<{ storeId: string|undefined|null }> = ({ storeId }) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const url = `${process.env.NEXT_PUBLIC_API_URL}/store/${storeId}/get-faq`;

	// Optimized fetcher with error handling
	const fetcher = useCallback(async (url: string) => {
		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			return response.json();
		} catch (error) {
			clientLogger.error(error as Error, {
				message: "Failed to fetch FAQ data",
				metadata: { url },
				tags: ["faq", "fetch", "error"],
				service: "FAQ",
				environment: process.env.NODE_ENV,
				version: process.env.npm_package_version,
			});
			throw error;
		}
	}, []);

	const handleRetry = useCallback(() => {
		window.location.reload();
	}, []);

	const { data, error, isLoading } = useSWR(url, fetcher, {
		refreshInterval: REFRESH_INTERVAL,
		revalidateOnFocus: false,
		revalidateOnReconnect: true,
		errorRetryCount: ERROR_RETRY_COUNT,
		errorRetryInterval: ERROR_RETRY_INTERVAL,
	});

	// Memoized filtered FAQ content
	const faqContent = useMemo(() => {
		if (isLoading || error || !data) return [];
		return data.filter((item: FaqCategory) => item.localeId === lng);
	}, [data, isLoading, error, lng]);

	// Memoized default tab value
	const defaultTabValue = useMemo(() => {
		return faqContent.length > 0 ? faqContent[0].id : "";
	}, [faqContent]);

	if (!storeId) return null;

	// Loading state
	if (isLoading) {
		return (
			<div
				id="faq"
				className="h-screen w-full flex items-center justify-center"
				aria-label="Loading FAQ"
			>
				<div className="text-center">
					<ClipLoader size={40} color="#f59e0b" />
					<p className="mt-4 text-gray-600">
						Loading frequently asked questions...
					</p>
				</div>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div
				id="faq"
				className="h-screen w-full flex items-center justify-center"
			>
				<div className="text-center">
					<Heading title="Failed to Load FAQ" className="text-red-600 mb-4" />
					<p className="text-gray-600 mb-4">
						Unable to load frequently asked questions. Please try again later.
					</p>
					<button
						type="button"
						onClick={handleRetry}
						className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
					>
						Retry
					</button>
				</div>
			</div>
		);
	}

	// No FAQ content available
	if (!faqContent.length) {
		return (
			<div
				id="faq"
				className="h-screen w-full flex items-center justify-center"
			>
				<div className="text-center">
					<Heading title="No FAQ Available" className="mb-4" />
					<p className="text-gray-600">
						No frequently asked questions are currently available for your
						language.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div
			id="faq"
			className="h-screen w-full"
			aria-label="Frequently Asked Questions"
		>
			<Tabs defaultValue={defaultTabValue}>
				<TabsList className="flex w-full mb-6">
					{faqContent.map((category: FaqCategory) => (
						<TabsTrigger
							key={category.id}
							value={category.id}
							className="flex-auto hover:no-underline hover:backdrop-contrast-200 focus:outline-none focus:ring-2 focus:ring-amber-400 rounded transition-all duration-200"
							aria-label={`Switch to ${category.name} category`}
						>
							{category.name}
						</TabsTrigger>
					))}
				</TabsList>
				{faqContent.map((category: FaqCategory) => (
					<FAQCategory key={category.id} category={category} />
				))}
			</Tabs>
		</div>
	);
};
