import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { NextResponse } from "next/server";

// returns locales; if ?storeId is provided, filters to that store's supportedLocales
export async function GET(req: Request) {
	const log = logger.child({ module: "get-locales" });

	try {
		const { searchParams } = new URL(req.url);
		const storeId = searchParams.get("storeId");

		let supportedLocaleIds: string[] | undefined;
		let defaultLocaleLng = "tw";

		if (storeId) {
			const store = await sqlClient.store.findUnique({
				where: { id: storeId },
				select: { supportedLocales: true, defaultLocale: true },
			});
			if (store?.supportedLocales?.length) {
				supportedLocaleIds = store.supportedLocales;
			}
			defaultLocaleLng = store?.defaultLocale ?? "tw";
		}

		const locales = await sqlClient.locale.findMany({
			where: supportedLocaleIds
				? { id: { in: supportedLocaleIds } }
				: undefined,
			orderBy: { id: "asc" },
		});

		if (storeId) {
			const defaultLocaleId =
				locales.find((l) => l.lng === defaultLocaleLng)?.id ?? "";
			return NextResponse.json({ locales, defaultLocaleId });
		}

		return NextResponse.json(locales);
	} catch (error) {
		log.error(error, {
			message: "Failed to get locales",
			tags: ["locales", "error"],
			service: "get-locales",
			environment: process.env.NODE_ENV,
			version: process.env.npm_package_version,
		});

		return new NextResponse("Internal error", { status: 500 });
	}
}
