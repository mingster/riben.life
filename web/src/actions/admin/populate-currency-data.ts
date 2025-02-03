"use server";

import { promises as fs } from "fs";
import { sqlClient } from "@/lib/prismadb";

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
			console.log(currency);
		} catch (err) {
			console.log(`${i}: ${c.currency}`, c.name, c.symbolNative);
			console.error(err);
		}
	}

	return true;
}
