"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export type TOCEntry = {
	level: number;
	text: string;
	slug: string;
	children: TOCEntry[];
};

export function TableOfContents({
	tableOfContents,
}: {
	tableOfContents: TOCEntry[];
}) {
	const [activeSection, setActiveSection] = useState<string | null>(null);

	// Handle smooth scrolling to sections
	const handleClick = (
		e: React.MouseEvent<HTMLAnchorElement>,
		slug: string,
	) => {
		e.preventDefault();

		// Remove the # from slug to get the id
		const id = slug.replace("#", "");
		const element = document.getElementById(id);

		if (element) {
			// Get the navbar height or any fixed header height
			const offset = 100; // Adjust this value based on your header height
			const elementPosition = element.getBoundingClientRect().top;
			const offsetPosition = elementPosition + window.pageYOffset - offset;

			window.scrollTo({
				top: offsetPosition,
				behavior: "smooth",
			});

			// Update URL without jumping
			history.pushState(null, "", slug);
		}
	};

	useEffect(() => {
		const article = document.querySelector("article.prose");
		if (!article) return;

		const headings = article.querySelectorAll("h2, h3");
		const sections: Map<Element, string> = new Map();

		// Map all elements to their respective section IDs
		let currentSectionId: string | null = null;
		for (const element of article.children) {
			if (
				element.id &&
				(element.tagName === "H2" || element.tagName === "H3")
			) {
				currentSectionId = element.id;
			}
			if (!currentSectionId) continue;
			sections.set(element, `#${currentSectionId}`);
		}

		const visibleElements = new Set<Element>();

		const callback = (entries: IntersectionObserverEntry[]) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					visibleElements.add(entry.target);
				} else {
					visibleElements.delete(entry.target);
				}
			}

			const firstVisibleSection = Array.from(sections.entries()).find(
				([element]) => visibleElements.has(element),
			);
			if (!firstVisibleSection) return;
			setActiveSection(firstVisibleSection[1]);
		};

		const observer = new IntersectionObserver(callback, {
			rootMargin: "-80px 0px -80% 0px",
		});

		for (const element of sections.keys()) {
			observer.observe(element);
		}

		return () => observer.disconnect();
	}, []);

	if (!tableOfContents.length) return null;

	return (
		<nav className="w-full rounded-lg border border-gray-200 bg-white/50 p-4 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/50">
			<h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
				On this page
			</h2>
			<ul className="space-y-2 text-sm">
				{tableOfContents.map((entry) => (
					<li key={entry.slug}>
						<a
							href={entry.slug}
							onClick={(e) => handleClick(e, entry.slug)}
							className={cn(
								"block py-1 transition-colors hover:text-gray-900 cursor-pointer dark:hover:text-white",
								activeSection === entry.slug
									? "font-medium text-sky-500 dark:text-sky-400"
									: "text-gray-600 dark:text-gray-400",
							)}
						>
							{entry.text}
						</a>
						{entry.children.length > 0 && (
							<ul className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-4 dark:border-gray-800">
								{entry.children.map((child) => (
									<li key={child.slug}>
										<a
											href={child.slug}
											onClick={(e) => handleClick(e, child.slug)}
											className={cn(
												"block py-1 text-xs transition-colors hover:text-gray-900 cursor-pointer dark:hover:text-white",
												activeSection === child.slug
													? "font-medium text-sky-500 dark:text-sky-400"
													: "text-gray-600 dark:text-gray-400",
											)}
										>
											{child.text}
										</a>
									</li>
								))}
							</ul>
						)}
					</li>
				))}
			</ul>
			<div className="mt-4">
				<Link href="/blog" className="text-sm text-gray-500 dark:text-gray-400">
					Blog Index
				</Link>
			</div>
		</nav>
	);
}
