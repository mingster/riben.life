"use server";

import { promises as fs } from "fs";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

// create default locales
//
export async function create_locales() {
	const locale_Path = `${process.cwd()}/public/install/locales.json`;

	const file = await fs.readFile(locale_Path, "utf8");
	const data = JSON.parse(file);
	for (let i = 0; i < data.length; i++) {
		const c = data[i];
		//try {

		/*
    const currency = await sqlClient.currency.findUnique({
      where: { id: c.currency },
    });

    if (!currency) {
        logger.error("Operation log", {
        	tags: ["action", "error"],
        });
        continue;
      }
    */

		const locale = await sqlClient.locale.create({
			data: {
				...c,
				/*
        id: c.id,
        name: c.name,
        lng: c.lng,
        defaultCurrencyId: c.id,
        */
			},
		});

		/*} catch (err) {
      logger.error("Operation log", {
      	tags: ["action", "error"],
      });
    }*/
	}
}

// create default payment methods and mapping to all countries
//
export async function create_paymentMethods() {
	const payment_methodPath = `${process.cwd()}/public/install/payment_methods.json`;

	const file = await fs.readFile(payment_methodPath, "utf8");
	const data = JSON.parse(file);

	//const countries = await sqlClient.country.findMany();

	for (let i = 0; i < data.length; i++) {
		const c = data[i];
		try {
			const paymentMethod = await sqlClient.paymentMethod.create({
				data: {
					...c,
					createdAt: getUtcNowEpoch(),
					updatedAt: getUtcNowEpoch(),
					/*
          name: c.name,
          payUrl: c.payurl,
          isDefault: c.isDefault,

          paymentMethodCountryMapping: {
            createMany: {
              data: countries.map((country) => ({
                countryId: country.alpha3, // Add countryId property
              })),
            },
          },
          */
				},
			});
		} catch (err) {
			logger.error("Error creating payment method", {
				tags: ["action", "error", "paymentMethod"],
				metadata: {
					error: err instanceof Error ? err.message : String(err),
				},
			});
		}
	}
}

// create shipping methods and mapping to all countries
//
export async function create_shippingMethods() {
	const shipping_methodPath = `${process.cwd()}/public/install/shipping_methods.json`;

	const file = await fs.readFile(shipping_methodPath, "utf8");
	const data = JSON.parse(file);

	//const countries = await sqlClient.country.findMany();

	for (let i = 0; i < data.length; i++) {
		const c = data[i];
		try {
			const currency = await sqlClient.currency.findUnique({
				where: { id: c.currencyId },
			});

			if (!currency) {
				logger.error("Currency not found", {
					tags: ["action", "error", "currency"],
					metadata: {
						currencyId: c.currencyId,
					},
				});
				continue;
			}

			const shippingMethod = await sqlClient.shippingMethod.create({
				data: {
					...c,
					createdAt: getUtcNowEpoch(),
					updatedAt: getUtcNowEpoch(),
					/*
          name: c.name,
          description: c.description,
          basic_price: c.price,
          currencyId: currency.id,
          isDefault: c.isDefault,

          shippingMethodCountryMapping: {
            createMany: {
              data: {
                countryId: 'TWN',
              },
            },
          },
          */
					/* create mapping for all countries
          shippingMethodCountryMapping: {
            createMany: {
              data: countries.map((country) => ({
                countryId: country.alpha3, // Add countryId property
              })),
            },
          },
          */
				},
			});
		} catch (err) {
			logger.error("Error creating shipping method", {
				tags: ["action", "error", "shippingMethod"],
				metadata: {
					error: err instanceof Error ? err.message : String(err),
				},
			});
		}
	}
}

export async function wipeoutDefaultData() {
	await sqlClient.locale.deleteMany();
	await sqlClient.paymentMethod.deleteMany();
	await sqlClient.shippingMethod.deleteMany();
	await sqlClient.currency.deleteMany();
	await sqlClient.country.deleteMany();
}
