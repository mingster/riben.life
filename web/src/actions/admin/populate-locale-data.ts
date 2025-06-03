"use server";

import { promises as fs } from "fs";
import { sqlClient } from "@/lib/prismadb";

export async function populateLocaleData() {
	const filePath = `${process.cwd()}/public/install/locales.json`;

	console.log(filePath);
	const file = await fs.readFile(filePath, "utf8");
	const data = JSON.parse(file);

	console.log(data);

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

			console.log("locale", locale);
		} catch (err) {
			console.log(`${i}: ${locale.name}`, locale.lng, locale.defaultCurrencyId);
			console.error(err);
		}
	}

	return true;
}
