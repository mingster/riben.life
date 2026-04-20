import fs from "node:fs/promises";
import path from "node:path";
import { Author } from "./authors";
import { format } from "date-fns";
import { extractHeadingsFromMDX } from "./extract-headings";
import type { TOCEntry } from "./table-of-contents";

// Use process.cwd() for more reliable path resolution in production
// Handle both monorepo (root/web/blogData) and standalone (root/blogData) structures
async function getBlogDataDir(): Promise<string> {
	const cwd = process.cwd();

	// Check if blogData exists at current directory (most common case)
	const directPath = path.join(cwd, "blogData");
	try {
		await fs.access(directPath);
		return directPath;
	} catch {
		// If not found, check if we're in a monorepo and blogData is in web subdirectory
		const webPath = path.join(cwd, "web", "blogData");
		try {
			await fs.access(webPath);
			return webPath;
		} catch {
			// Fallback to direct path (will error later with more context)
			return directPath;
		}
	}
}

export async function getBlogPostBySlug(slug: string): Promise<{
	Component: React.FC;
	meta: {
		title: string;
		date: string;
		excerpt: React.ReactElement;
		authors: Author[];
		description: string;
		image?: {
			src: string;
		};
		private?: boolean;
	};
	slug: string;
	tableOfContents: TOCEntry[];
} | null> {
	try {
		const blogDataDir = await getBlogDataDir();
		const mdxPath = path.join(blogDataDir, `${slug}/index.mdx`);

		// Check if the file exists
		if (!(await fs.stat(mdxPath).catch(() => null))) {
			return null;
		}

		// Read MDX file content to extract headings
		const mdxContent = await fs.readFile(mdxPath, "utf-8");
		const tableOfContents = extractHeadingsFromMDX(mdxContent);

		const mdxModule = await import(`../../../blogData/${slug}/index.mdx`);
		if (!mdxModule.default) {
			return null;
		}

		return {
			Component: mdxModule.default,
			meta: {
				authors: [],
				...mdxModule.meta,
			},
			slug,
			tableOfContents,
		};
	} catch (e) {
		console.error(e);
		return null;
	}
}

export async function getBlogPostSlugs(): Promise<string[]> {
	const posts: { slug: string; date: number }[] = [];

	try {
		const blogDataDir = await getBlogDataDir();
		const folders = await fs.readdir(blogDataDir);

		await Promise.allSettled(
			folders.map(async (folder) => {
				if (folder.startsWith(".")) return;
				try {
					const post = await getBlogPostBySlug(folder);
					if (!post) return;

					posts.push({
						slug: post.slug,
						date: new Date(post.meta.date).getTime(),
					});
				} catch (e) {
					console.error(e);
				}
			}),
		);

		posts.sort((a, b) => b.date - a.date);

		return posts.map((post) => post.slug);
	} catch (error) {
		console.error("Error reading blog data directory:", error);
		console.error("Current working directory:", process.cwd());
		const attemptedPath = await getBlogDataDir();
		console.error("Looking for directory at:", attemptedPath);
		return [];
	}
}

export function formatDate(timestamp: string) {
	const date = new Date(timestamp);

	return date.toLocaleDateString("en-US", {
		month: "2-digit",
		day: "2-digit",
		year: "numeric",
	});
}

export function nonNullable<T>(x: T | null): x is NonNullable<T> {
	return x !== null;
}
