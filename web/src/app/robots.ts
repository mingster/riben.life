import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://riben.life";
	const isProduction =
		process.env.VERCEL_ENV === "production" ||
		process.env.NODE_ENV === "production";
	const noIndex = process.env.NEXT_PUBLIC_NO_INDEX === "true" || !isProduction;

	// Disallow everything for non-production or explicitly no-index environments
	if (noIndex) {
		return {
			rules: [
				{
					userAgent: "*",
					disallow: "/",
				},
			],
		};
	}

	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: [
					"/api/*",
					"/auth/*",
					"/checkout/*",
					"/refund/*",
					"/order/*",
					"/sysAdmin/*",
					"/storeAdmin/*",
					"/account/*",
					"/_next/*",
					"/private/*",
				],
			},
			{
				userAgent: "GPTBot", // OpenAI's web crawler
				disallow: "/",
			},
			{
				userAgent: "ChatGPT-User",
				disallow: "/",
			},
			{
				userAgent: "CCBot", // Common Crawl bot
				disallow: "/",
			},
			{
				userAgent: "Google-Extended", // Google's AI training bot
				disallow: "/",
			},
			{
				userAgent: "anthropic-ai", // Claude/Anthropic bot
				disallow: "/",
			},
			{
				userAgent: "ClaudeBot",
				disallow: "/",
			},
			{
				userAgent: "Bytespider", // TikTok/ByteDance bot
				disallow: "/",
			},
			{
				userAgent: "Applebot-Extended", // Apple's AI training bot
				disallow: "/",
			},
		],
		sitemap: `${baseUrl}/sitemap.xml`,
		host: baseUrl,
	};
}
