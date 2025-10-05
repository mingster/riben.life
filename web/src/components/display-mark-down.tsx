"use client";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import type { Components } from "react-markdown";

// display markdown content
//
export default function DisplayMarkDown({ content }: { content: string }) {
	if (!content) {
		return "";
	}

	const components: Components = {
		p: ({ children, ...props }) => (
			<div className="text-base pt-1 pb-1" {...props}>
				{children}
			</div>
		),
		h1: ({ children, ...props }) => (
			<h1 className="text-2xl font-bold pt-2 pb-5" {...props}>
				{children}
			</h1>
		),
		h2: ({ children, ...props }) => (
			<h2 className="text-xl font-bold pt-2 pb-2" {...props}>
				{children}
			</h2>
		),
		h3: ({ children, ...props }) => (
			<h3 className="text-lg font-bold pt-2 pb-2" {...props}>
				{children}
			</h3>
		),
		h4: ({ children, ...props }) => (
			<h4 className="text-base font-bold pt-2 pb-2" {...props}>
				{children}
			</h4>
		),
		h5: ({ children, ...props }) => (
			<h5 className="text-base font-bold pt-2 pb-5" {...props}>
				{children}
			</h5>
		),
		h6: ({ children, ...props }) => (
			<h6 className="text-base font-bold pt-2 pb-2" {...props}>
				{children}
			</h6>
		),
		// Ordered lists (1. 2. 3.)
		ol: ({ children, ...props }) => (
			<ol
				className="list-decimal list-inside space-y-1 my-4 ml-4 [&_ol]:ml-6 [&_ol_ol]:ml-8"
				{...props}
			>
				{children}
			</ol>
		),
		// Unordered lists (- * •)
		ul: ({ children, ...props }) => (
			<ul
				className="list-disc list-inside space-y-1 my-4 ml-4 [&_ul]:ml-6 [&_ul_ul]:ml-8"
				{...props}
			>
				{children}
			</ul>
		),
		// List items
		li: ({ children, ...props }) => (
			<li
				className="text-base leading-relaxed [&>ul]:mt-2 [&>ol]:mt-2"
				{...props}
			>
				{children}
			</li>
		),
		a: ({ children, ...props }) => (
			<a
				className="text-amber-700 dark:text-amber-100 hover:backdrop-contrast-200"
				{...props}
				target="_blank"
				rel="noopener noreferrer"
			>
				{children}
			</a>
		),
		code: ({ children, ...props }) => (
			<code {...props} className="p-1 rounded-md font-mono">
				{children}
			</code>
		),
		// Blockquotes
		blockquote: ({ children, ...props }) => (
			<blockquote
				className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-4 italic text-gray-700 dark:text-gray-300"
				{...props}
			>
				{children}
			</blockquote>
		),
		// Tables
		table: ({ children, ...props }) => (
			<div className="overflow-x-auto my-4">
				<table
					className="min-w-full border-collapse border border-gray-300 dark:border-gray-600"
					{...props}
				>
					{children}
				</table>
			</div>
		),
		thead: ({ children, ...props }) => (
			<thead className="bg-gray-100 dark:bg-gray-800" {...props}>
				{children}
			</thead>
		),
		tbody: ({ children, ...props }) => (
			<tbody
				className="divide-y divide-gray-300 dark:divide-gray-600"
				{...props}
			>
				{children}
			</tbody>
		),
		tr: ({ children, ...props }) => (
			<tr className="hover:bg-gray-50 dark:hover:bg-gray-700" {...props}>
				{children}
			</tr>
		),
		th: ({ children, ...props }) => (
			<th
				className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold"
				{...props}
			>
				{children}
			</th>
		),
		td: ({ children, ...props }) => (
			<td
				className="border border-gray-300 dark:border-gray-600 px-4 py-2"
				{...props}
			>
				{children}
			</td>
		),
		// Horizontal rules
		hr: ({ ...props }) => (
			<hr
				className="my-6 border-t border-gray-300 dark:border-gray-600"
				{...props}
			/>
		),
		// Preformatted text
		pre: ({ children, ...props }) => (
			<pre
				className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto my-4"
				{...props}
			>
				{children}
			</pre>
		),
	};

	return (
		<div className="markdown-content">
			<ReactMarkdown
				remarkPlugins={[remarkGfm, remarkRehype, remarkParse]}
				rehypePlugins={[rehypeHighlight]}
				components={components}
			>
				{content}
			</ReactMarkdown>

			{/* Custom CSS for better list handling */}
			<style jsx>{`
				.markdown-content ul ul,
				.markdown-content ol ol {
					margin-left: 1.5rem;
				}
				
				.markdown-content ul ul ul,
				.markdown-content ol ol ol {
					margin-left: 3rem;
				}
				
				.markdown-content li {
					margin-bottom: 0.25rem;
				}
				
				.markdown-content li > ul,
				.markdown-content li > ol {
					margin-top: 0.5rem;
					margin-bottom: 0.5rem;
				}
			`}</style>
		</div>
	);
}
