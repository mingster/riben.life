import type { MetadataRoute } from "next";
import { getBlogPostBySlug, getBlogPostSlugs, nonNullable } from "./blog/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://riben.life";

	// Static routes
	const staticRoutes: MetadataRoute.Sitemap = [
		{
			url: baseUrl,
			lastModified: new Date(),
			changeFrequency: "daily",
			priority: 1,
		},
		{
			url: `${baseUrl}/blog`,
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 0.8,
		},
		{
			url: `${baseUrl}/qr-generator`,
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 0.7,
		},
		{
			url: `${baseUrl}/privacy`,
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 0.5,
		},
		{
			url: `${baseUrl}/terms`,
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 0.5,
		},
	];

	// Dynamic blog routes
	try {
		const slugs = await getBlogPostSlugs();
		const posts = (await Promise.all(slugs.map(getBlogPostBySlug)))
			.filter(nonNullable)
			.filter((post) => !post.meta.private);

		const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
			url: `${baseUrl}/blog/${post.slug}`,
			lastModified: post.meta.date ? new Date(post.meta.date) : new Date(),
			changeFrequency: "monthly" as const,
			priority: 0.6,
		}));

		return [...staticRoutes, ...blogRoutes];
	} catch (error) {
		console.error("Error generating sitemap:", error);
		return staticRoutes;
	}
}
