import { populateCountryData } from "@/actions/admin/populate-country-data";
import { populateCurrencyData } from "@/actions/admin/populate-currency-data";
import {
	create_locales,
	create_paymentMethods,
	create_shippingMethods,
} from "@/actions/admin/populate-payship_defaults";
import { updateStoreDefaultPayMethods } from "@/actions/admin/updateStoreDefaultPayMethods";

import { Button } from "@/components/ui/button";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { stripe } from "@/lib/stripe/config";
import logger from "@/lib/logger";
import type { PlatformSettings } from "@prisma/client";
import Link from "next/link";

//type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export const revalidate = false; // Never revalidate
export const dynamic = "force-static"; // Build once
export default async function InstallDefaultDataPage(_props: {
	//params: Params;
	searchParams: SearchParams;
}) {
	//const params = await props.params;

	const setting = await sqlClient.platformSettings.findFirst();
	if (!setting) {
		createStripeProducts(null);
	} else {
		// check if stripe product id is valid
		try {
			const product = await stripe.products.retrieve(
				setting.stripeProductId as string,
			);
			if (!product) {
				createStripeProducts(setting);
			}
		} catch (err) {
			logger.error(err);
			createStripeProducts(setting);
		}
	}
	//logger.info("platform setting", setting);
	console.log(JSON.stringify(setting));

	const countryCount = await sqlClient.country.count();
	const currencyCount = await sqlClient.currency.count();
	const localeCount = await sqlClient.locale.count();
	const paymentMethodsCount = await sqlClient.paymentMethod.count();
	const shippingMethodsCount = await sqlClient.shippingMethod.count();

	createBaseObjects(countryCount, currencyCount, localeCount);

	return (
		<Container className="flex flex-1 items-center justify-end space-x-2 font-mono">
			<div className="flex">Platform Settings: {JSON.stringify(setting)}</div>
			<div className="flex">Country Count: {countryCount}</div>
			<div className="flex">Currency Count: {currencyCount}</div>
			<div className="flex">Locale Count: {localeCount}</div>
			<div className="flex">Payment Method Count: {paymentMethodsCount}</div>
			<div className="flex">Shipping Method Count: {shippingMethodsCount}</div>

			<Button
				onClick={updateStoreDefaultPayMethods}
				type="button"
				variant="destructive"
				className="disabled:opacity-50 z-0"
				size="sm"
			>
				Click to Update Stores to Default PayMethods
			</Button>

			<Button variant="default" size="sm">
				<Link href="/" className="text-xs">
					Finish
				</Link>
			</Button>
		</Container>
	);
}

async function createStripeProducts(setting: PlatformSettings | null) {
	const product = await stripe.products.create({
		name: "riben.life subscription",
	});

	const price = await stripe.prices.create({
		currency: "twd",
		unit_amount: 30000, //NT$300
		recurring: {
			interval: "month",
		},
		product: product.id,
	});

	logger.info("stripe product created", { metadata: { product } });
	logger.info("stripe price created", { metadata: { price } });

	if (product && product !== null && product.id !== null) {
		if (setting === null) {
			await sqlClient.platformSettings.create({
				data: {
					//id: crypto.randomUUID(), // Generate a unique ID for the record
					stripeProductId: product.id as string,
					stripePriceId: price.id as string,
					//stripeProductName: obj.name,
				},
			});
			logger.info("platform setting created", { metadata: { product, price } });
		} else {
			await sqlClient.platformSettings.update({
				where: {
					id: setting.id,
				},
				data: {
					stripeProductId: product.id as string,
					stripePriceId: price.id as string,
				},
			});
			logger.info("platform setting updated", { metadata: { setting } });
		}
	}

	console.log(product.id);
}

//async function updateStoreDefaultPayMethods() {}

async function createBaseObjects(
	countryCount: number,
	currencyCount: number,
	localeCount: number,
) {
	if (countryCount === 0) {
		await populateCountryData();
	}
	console.log(`countryCount:${countryCount}`);

	if (currencyCount === 0) {
		await populateCurrencyData();
	}
	console.log(`currencyCount:${currencyCount}`);

	if (localeCount === 0) {
		await create_locales();
	}
	console.log(`localeCount:${localeCount}`);

	const paymentMethods = await sqlClient.paymentMethod.findMany();
	if (paymentMethods.length === 0) {
		await create_paymentMethods();
	}
	console.log(`paymentMethods:${JSON.stringify(paymentMethods)}`);

	const shippingMethods = await sqlClient.shippingMethod.findMany();
	if (shippingMethods.length === 0) {
		await create_shippingMethods();
	}
	console.log(`shippingMethods:${JSON.stringify(shippingMethods)}`);
}
