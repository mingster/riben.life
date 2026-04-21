import type { TOCEntry } from "./table-of-contents";

/**
 * Generate a slug from heading text that matches mdx-components slugify behavior
 * This ensures consistency between TOC links and actual heading IDs
 * Supports Unicode characters (Chinese, Japanese, etc.)
 */
function generateSlug(text: string, fallbackIndex?: number): string {
	const slug = text
		.toLowerCase()
		.trim() // Remove whitespace from both ends
		.replace(/\s+/g, "-") // Replace spaces with hyphens
		.replace(/&/g, "-and-") // Replace & with 'and'
		.replace(/[^\p{L}\p{N}\-]+/gu, "") // Remove non-letter, non-number chars except hyphens (Unicode-aware)
		.replace(/\-\-+/g, "-") // Replace multiple hyphens with single hyphen
		.replace(/^-+/, "") // Trim hyphens from start
		.replace(/-+$/, ""); // Trim hyphens from end

	// Fallback for empty slugs or provide unique identifier
	if (!slug) {
		return fallbackIndex !== undefined ? `heading-${fallbackIndex}` : "heading";
	}

	return slug;
}

/**
 * Extract headings from MDX content to generate table of contents
 * This runs on the server side during build
 */
export function extractHeadingsFromMDX(mdxContent: string): TOCEntry[] {
	const headingRegex = /^#{2,3}\s+(.+)$/gm;
	const matches = Array.from(mdxContent.matchAll(headingRegex));

	const headings: Array<{ level: number; text: string; slug: string }> = [];
	const slugCounts = new Map<string, number>();

	for (let i = 0; i < matches.length; i++) {
		const match = matches[i];
		const fullMatch = match[0];
		const text = match[1].trim();
		const level = fullMatch.match(/^#+/)?.[0].length || 2;

		// Generate slug from heading text
		const baseSlug = generateSlug(text, i);

		// Ensure unique slugs by appending counter if duplicate
		const count = slugCounts.get(baseSlug) || 0;
		slugCounts.set(baseSlug, count + 1);

		const slug = count > 0 ? `#${baseSlug}-${count}` : `#${baseSlug}`;

		headings.push({ level, text, slug });
	}

	// Build hierarchical structure (H2 with H3 children)
	const toc: TOCEntry[] = [];
	let currentH2: TOCEntry | null = null;

	for (const heading of headings) {
		if (heading.level === 2) {
			currentH2 = { ...heading, children: [] };
			toc.push(currentH2);
		} else if (heading.level === 3 && currentH2) {
			currentH2.children.push({ ...heading, children: [] });
		}
	}

	return toc;
}
