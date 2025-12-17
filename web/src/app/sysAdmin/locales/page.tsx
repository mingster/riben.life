"use server";

import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { LocaleClient } from "./components/client-locale";
import { mapLocaleToColumn, type LocaleColumn } from "./locale-column";

export default async function LocalesPage() {
	const locales = await sqlClient.locale.findMany({
		orderBy: {
			name: "asc",
		},
	});

	transformPrismaDataForJson(locales);

	const formattedLocales: LocaleColumn[] = locales.map(mapLocaleToColumn);

	return (
		<Container>
			<LocaleClient serverData={formattedLocales} />
		</Container>
	);
}
