"use server";

import { promises as fs } from "fs";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";

export async function populateLocaleData() {
	const filePath = `${process.cwd()}/public/install/locales.json`;

	logger.info("Operation log", {
		tags: ["action"],
	});
	const file = await fs.readFile(filePath, "utf8");
	const data = JSON.parse(file);

	logger.info("Operation log", {
		tags: ["action"],
	});

	for (let i = 0; i < data.length; i++) {
		const locale = data[i];

		try {
			await sqlClient.locale.create({
				data: {
					id: locale.id,
					name: locale.name,
					lng: locale.lng,
					defaultCurrencyId: locale.defaultCurrencyId,
				},
			});
		} catch (err) {
			logger.error("Error creating locale", {
				tags: ["action", "error", "locale"],
				metadata: {
					error: err instanceof Error ? err.message : String(err),
				},
			});
		}
	}
	return true;
}
