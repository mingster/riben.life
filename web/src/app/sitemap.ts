import { sqlClient } from "@/lib/prismadb";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const baseUrl: string =
		process.env.NEXT_PUBLIC_BASE_URL ?? "https://riben.life";

	// list all stores in the database
	const stores = await sqlClient.store.findMany({
		select: {
			id: true,
			name: true,
			createdAt: true,
		},
	});

	const staticRoutes: MetadataRoute.Sitemap = stores.map((store) => ({
		url: `${baseUrl}/${store.id}`,
		lastModified:
			store.createdAt instanceof Date
				? store.createdAt
				: typeof store.createdAt === "number"
					? new Date(store.createdAt)
					: typeof store.createdAt === "bigint"
						? new Date(Number(store.createdAt))
						: new Date(),
		changeFrequency: "monthly",
		priority: 0.8,
	}));

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
