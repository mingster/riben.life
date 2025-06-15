"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { sqlClient } from "@/lib/prismadb";

import fs from "node:fs";
import { GetSession } from "@/lib/auth/utils";
import { StoreLevel } from "@/types/enum";
import logger from "@/utils/logger";
import type { Session } from "next-auth";
import type { z } from "zod";
import type { formSchema } from "./store-modal";

//NOTE - do not move this to other folder.
//
export const createStore = async (values: z.infer<typeof formSchema>) => {
	const session = (await GetSession()) as Session;
	const ownerId = session.user?.id;

	if (!session || !session.user || !ownerId) {
		redirect(
			`${process.env.NEXT_PUBLIC_API_URL}/auth/signin/?callbackUrl=/storeAdmin`,
		);
	}

	//console.log(values);
	const { name, defaultLocale, defaultCountry, defaultCurrency } = values;

	//console.log(`data: ${name}${ownerId}${defaultLocale}${defaultCountry}${defaultCurrency}`,);

	//1. create in prisma
	const defaultPaymentMethods = await sqlClient.paymentMethod.findMany({
		where: {
			isDefault: true,
		},
	});

	const defaultShippingMethods = await sqlClient.shippingMethod.findMany({
		where: {
			isDefault: true,
		},
	});

	const store = await sqlClient.store.create({
		data: {
			name,
			ownerId,
			defaultCountry: defaultCountry,
			defaultCurrency: defaultCurrency,
			defaultLocale: defaultLocale,
			level: StoreLevel.Free,
			StorePaymentMethods: {
				createMany: {
					data: defaultPaymentMethods.map((paymentMethod) => ({
						methodId: paymentMethod.id,
					})),
				},
			},
			StoreShippingMethods: {
				createMany: {
					data: defaultShippingMethods.map((shippingMethod) => ({
						methodId: shippingMethod.id,
					})),
				},
			},
		},
	});

	try {
		if (session.user.role === "USER") {
			// mark the user as OWNER
			await sqlClient.user.update({
				where: {
					id: ownerId,
				},
				data: {
					role: "OWNER",
				},
			});
		}
	} catch (error) {
		console.log(`${error}the user is not in USER role`);
	}

	const databaseId = store.id;
	//console.log('databaseId: ' + databaseId);

	// populate defaults: privacy policy and terms of service
	//
	const termsfilePath = `${process.cwd()}/public/defaults/terms.md`;
	const tos = fs.readFileSync(termsfilePath, "utf8");

	const privacyfilePath = `${process.cwd()}/public/defaults/privacy.md`;
	const privacyPolicy = fs.readFileSync(privacyfilePath, "utf8");

	// populate defaults business hours
	const bizhoursfilePath = `${process.cwd()}/public/defaults/business-hours.json`;
	const businessHours = fs.readFileSync(bizhoursfilePath, "utf8");

	await sqlClient.storeSettings.create({
		data: {
			storeId: databaseId,
			businessHours,
			privacyPolicy,
			tos,
		},
	});

	return databaseId;

	/*
  //2. create in mongo with database id from prisma
  await connectToMongoDB();
  // Extracting Store content and time from formData
  //const databaseId = formData.get('databaseId');
  //const name = formData.get('name');
  //const domainName = formData.get('domainName');

  try {
	// Creating a new Store using Store model
	const newStore = await StoreModel.create({
	  databaseId,
	  name,
	  //domainName,
	});
	// Saving the new Store
	newStore.save();
	// Triggering revalidation of the specified path ("/")
	revalidatePath('/');
	// Returning the string representation of the new Store

	const result = newStore.toString();
	console.log(result);

	return result;
  } catch (error) {
	console.log(error);
	return { message: 'error creating Store' };
  }
	*/
};

export const deleteStore = async (id: FormData) => {
	// Extracting Store ID from formData
	const _StoreId = id.get("id");
	try {
		// Deleting the Store with the specified ID
		//await StoreModel.deleteOne({ _id: StoreId });
		// Triggering revalidation of the specified path ("/")
		revalidatePath("/");

		// Returning a success message after deleting the Store
		return "Store deleted";
	} catch (error) {
		logger.error(error);

		// Returning an error message if Store deletion fails
		return { message: "error deleting Store" };
	}
};
