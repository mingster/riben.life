"use server";

import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { CurrencyClient } from "./components/client-currency";
import { mapCurrencyToColumn, type CurrencyColumn } from "./currency-column";

export default async function CurrenciesPage() {
	const currencies = await sqlClient.currency.findMany({
		orderBy: {
			name: "asc",
		},
	});

	transformPrismaDataForJson(currencies);

	const formattedCurrencies: CurrencyColumn[] =
		currencies.map(mapCurrencyToColumn);

	return (
		<Container>
			<CurrencyClient serverData={formattedCurrencies} />
		</Container>
	);
}
