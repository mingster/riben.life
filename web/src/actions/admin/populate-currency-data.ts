"use server";

import { promises as fs } from "fs";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";

export async function populateCurrencyData() {
	const filePath = `${process.cwd()}/public/install/currency_iso.json`;
	//console.log(filePath);
	const file = await fs.readFile(filePath, "utf8");
	const data = JSON.parse(file);

	//console.log(data);

	for (let i = 0; i < data.length; i++) {
		const c = data[i];

		try {
			const currency = await sqlClient.currency.create({
				data: {
					id: c.currency,
					name: c.name,
					demonym: c.demonym,
					majorSingle: c.majorSingle,
					majorPlural: c.majorPlural,
					ISOnum: c.ISOnum,
					symbol: c.symbol,
					symbolNative: c.symbolNative,
					minorSingle: c.minorSingle,
					minorPlural: c.minorPlural,
					ISOdigits: c.ISOdigits,
					decimals: c.decimals,
					numToBasic: c.numToBasic,
				},
			});
			logger.info("Operation log", {
				tags: ["action"],
			});
		} catch (err) {
			logger.info("Operation log", {
				tags: ["action"],
			});
			logger.error("Operation log", {
				tags: ["action", "error"],
			});
		}
	}

	return true;
}
