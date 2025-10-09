import { Suspense } from "react";
import type Stripe from "stripe";
import { Loader } from "@/components/loader";
import { sqlClient } from "@/lib/prismadb";
import { stripe } from "@/lib/stripe/config";
import type { StringNVType } from "@/types/enum";
import logger from "@/lib/logger";
import ClientSettings from "./components/client-settings";
import type { PlatformSettings } from "@prisma/client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function SettingsAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const _params = await props.params;
	const log = logger.child({ module: "SettingsAdminPage" });

	const setting =
		(await sqlClient.platformSettings.findFirst()) as PlatformSettings;

	// log.info({ setting: setting });

	let prices: Stripe.Price[] = [];

	if (setting) {
		// parse settings to key-value pairs
		//const settingsKV = JSON.parse(setting.settings as string) as StringNVType[];

		// init if empty
		if (!setting.settings) {
			const settingsKV: StringNVType[] = [];
			settingsKV.push({ label: "App.Name", value: "riben.life" });
			settingsKV.push({ label: "Support.Email", value: "support@riben.life" });

			setting.settings = JSON.stringify(settingsKV);
			console.log("setting.settings", setting.settings);
			await sqlClient.platformSettings.update({
				where: { id: setting.id },
				data: { settings: setting.settings },
			});
		}

		try {
			if (setting.stripeProductId) {
				const pricesResponse = await stripe.prices.list({
					product: setting.stripeProductId as string,
				});
				prices = pricesResponse.data;
			}
		} catch (error) {
			log.error({ error });
			prices = [];
		}

		//log.info({ prices: prices });
	}

	return (
		<Suspense fallback={<Loader />}>
			<ClientSettings
				platformSettings={setting as PlatformSettings}
				prices={prices}
			/>
		</Suspense>
	);
}
