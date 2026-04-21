import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://riben.life";

	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: [
					"/api/*",
					"/dashboard/*",
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
	};
}
