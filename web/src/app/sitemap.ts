import { sqlClient } from "@/lib/prismadb";
import type { MetadataRoute } from "next";
import logger from "@/lib/logger";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const baseUrl: string =
		process.env.NEXT_PUBLIC_BASE_URL ?? "https://riben.life";

	const staticRoutes: MetadataRoute.Sitemap = [];

	// Try to fetch stores from database, but gracefully handle failures during build
	try {
		const stores = await sqlClient.store.findMany({
			select: {
				id: true,
				name: true,
				createdAt: true,
			},
		});

		const storeRoutes: MetadataRoute.Sitemap = stores.map((store) => ({
			url: `${baseUrl}/${store.id}`,
			lastModified:
				typeof store.createdAt === "bigint"
					? new Date(Number(store.createdAt))
					: typeof store.createdAt === "number"
						? new Date(store.createdAt)
						: new Date(),
			changeFrequency: "monthly",
			priority: 0.8,
		}));

		staticRoutes.push(...storeRoutes);
	} catch (error) {
		// Log error but continue with static routes only
		// This allows the build to succeed even if database is not accessible
		logger.warn("Failed to fetch stores for sitemap during build", {
			metadata: {
				error:
					error instanceof Error ? error.message : String(error),
				context: "sitemap generation",
			},
			tags: ["sitemap", "build", "warning"],
		});
	}

	staticRoutes.push({
		url: `${baseUrl}/unv`,
		lastModified: new Date(),
		changeFrequency: "monthly",
		priority: 0.8,
	});

	staticRoutes.push({
		url: `${baseUrl}/privacy`,
		lastModified: new Date(),
		changeFrequency: "monthly",
		priority: 0.5,
	});

	staticRoutes.push({
		url: `${baseUrl}/terms`,
		lastModified: new Date(),
		changeFrequency: "monthly",
		priority: 0.5,
	});

	return staticRoutes;
}
