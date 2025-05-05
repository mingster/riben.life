"use server";

import { promises as fs } from "fs";
import { sqlClient } from "@/lib/prismadb";

//this is used in install page. It populates country json file into database.
export async function populateCountryData() {
	const filePath = `${process.cwd()}/public/install/country_iso.json`;
	//console.log(filePath);
	const file = await fs.readFile(filePath, "utf8");
	const data = JSON.parse(file);

	//console.log(data);

	for (let i = 0; i < data.length; i++) {
		const c = data[i];

		//console.log(i + ': ' + c.alpha3, c.name, c.unCode);

		const country = await sqlClient.country.create({
			data: {
				alpha3: c.alpha3,
				name: c.name,
				unCode: c.unCode,
			},
		});
		console.log(country);
	}

	return true;
}
