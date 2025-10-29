"use client";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import React from "react";

interface ModalProps {
	title: string;
	description: string;
	isOpen: boolean;
	onClose: () => void;
	children?: React.ReactNode;
}

interface MarkdownComponentProps {
	node?: any;
	children?: React.ReactNode;
	[key: string]: any;
}

// Memoized markdown components for better performance
const createMarkdownComponents = () => ({
	p: ({ node, children, ...props }: MarkdownComponentProps) => {
		// Check if children contain block-level elements or if it's a single text node
		const childrenArray = React.Children.toArray(children);
		const hasBlockElements = childrenArray.some(
			(child: any) =>
				typeof child === "object" &&
				child?.type &&
				[
					"div",
					"h1",
					"h2",
					"h3",
					"h4",
					"h5",
					"h6",
					"ul",
					"ol",
					"blockquote",
					"table",
				].includes(child.type),
		);

		// If children contain block elements or if it's empty, render as div
		if (hasBlockElements || childrenArray.length === 0) {
			return (
				<div className="text-base pt-1 pb-1 leading-relaxed" {...props}>
					{children}
				</div>
			);
		}

		// For simple text content, use p tag
		return (
			<p className="text-base pt-1 pb-1 leading-relaxed" {...props}>
				{children}
			</p>
		);
	},
	h1: ({ node, ...props }: MarkdownComponentProps) => (
		<h1
			className="text-2xl font-bold pt-2 pb-5 text-gray-900 dark:text-gray-100"
			{...props}
		/>
	),
	h2: ({ node, ...props }: MarkdownComponentProps) => (
		<h2
			className="text-xl font-bold pt-2 pb-2 text-gray-900 dark:text-gray-100"
			{...props}
		/>
	),
	h3: ({ node, ...props }: MarkdownComponentProps) => (
		<h3
			className="text-lg font-bold pt-2 pb-2 text-gray-900 dark:text-gray-100"
			{...props}
		/>
	),
	h4: ({ node, ...props }: MarkdownComponentProps) => (
		<h4
			className="text-base font-bold pt-2 pb-2 text-gray-900 dark:text-gray-100"
			{...props}
		/>
	),
	h5: ({ node, ...props }: MarkdownComponentProps) => (
		<h5
			className="text-base font-bold pt-2 pb-2 text-gray-900 dark:text-gray-100"
			{...props}
		/>
	),
	h6: ({ node, ...props }: MarkdownComponentProps) => (
		<h6
			className="text-base font-bold pt-2 pb-2 text-gray-900 dark:text-gray-100"
			{...props}
		/>
	),
	a: ({ node, children, ...props }: MarkdownComponentProps) => (
		<a
			className="text-amber-700 dark:text-amber-100 hover:underline focus:outline-none focus:ring-2 focus:ring-amber-400 rounded transition-colors duration-200"
			{...props}
			target="_blank"
			rel="noopener noreferrer"
			aria-label={`External link: ${children}`}
		>
			{children}
		</a>
	),
	code: ({ node, ...props }: MarkdownComponentProps) => (
		<code
			{...props}
			className="bg-gray-100 dark:bg-gray-800 p-1 rounded-md font-mono text-sm"
		/>
	),
	ul: ({ node, ...props }: MarkdownComponentProps) => (
		<ul className="list-disc list-inside space-y-1 pt-1 pb-1" {...props} />
	),
	ol: ({ node, ...props }: MarkdownComponentProps) => (
		<ol className="list-decimal list-inside space-y-1 pt-1 pb-1" {...props} />
	),
	li: ({ node, ...props }: MarkdownComponentProps) => (
		<li className="text-base leading-relaxed" {...props} />
	),
	blockquote: ({ node, ...props }: MarkdownComponentProps) => (
		<blockquote
			className="border-l-4 border-amber-500 pl-4 italic text-gray-700 dark:text-gray-300 my-2"
			{...props}
		/>
	),
	strong: ({ node, ...props }: MarkdownComponentProps) => (
		<strong
			className="font-semibold text-gray-900 dark:text-gray-100"
			{...props}
		/>
	),
	em: ({ node, ...props }: MarkdownComponentProps) => (
		<em className="italic text-gray-800 dark:text-gray-200" {...props} />
	),
	table: ({ node, ...props }: MarkdownComponentProps) => (
		<div className="overflow-x-auto my-4">
			<table
				className="min-w-full border-collapse border border-gray-300 dark:border-gray-600"
				{...props}
			/>
		</div>
	),
	th: ({ node, ...props }: MarkdownComponentProps) => (
		<th
			className="border border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-100 dark:bg-gray-700 font-semibold"
			{...props}
		/>
	),
	td: ({ node, ...props }: MarkdownComponentProps) => (
		<td
			className="border border-gray-300 dark:border-gray-600 px-4 py-2"
			{...props}
		/>
	),
});

export const Modal: React.FC<ModalProps> = ({
	title,
	description,
	isOpen,
	onClose,
	children,
}) => {
	const onChange = (open: boolean) => {
		if (!open) {
			onClose();
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onChange} modal={true}>
			<DialogContent className="max-h-[calc(100vh-100px)] xl:max-w-4xl">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description.length <= 200 ? (
						<DialogDescription>{description}</DialogDescription>
					) : (
						<DialogDescription className="hidden" />
					)}
				</DialogHeader>

				{description.length > 200 && (
					<div className="mt-0">
						<ScrollArea className="w-full h-[calc(100vh-250px)] rounded-md border p-2">
							<ReactMarkdown
								remarkPlugins={[
									remarkGfm,
									remarkRehype,
									remarkParse,
									remarkHtml,
								]}
								rehypePlugins={[rehypeHighlight]}
								components={createMarkdownComponents()}
							>
								{description}
							</ReactMarkdown>
						</ScrollArea>
					</div>
				)}

				{children && <div className="mt-0 pt-0">{children}</div>}
			</DialogContent>
		</Dialog>
	);
};
