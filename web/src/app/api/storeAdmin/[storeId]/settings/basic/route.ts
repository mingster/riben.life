import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { transformPrismaDataForJson } from "@/utils/utils";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import logger from "@/lib/logger";

export async function PATCH(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		const session = await auth.api.getSession({
			headers: await headers(), // you need to pass the headers object.
		});
		const userId = session?.user.id;
		if (typeof userId !== "string") {
			return new NextResponse("Unauthenticated", { status: 400 });
		}

		const body = await req.json();

		const {
			name,
			orderNoteToCustomer,
			defaultLocale,
			defaultCountry,
			defaultCurrency,
			autoAcceptOrder,
			isOpen,
			acceptAnonymousOrder,
			useBusinessHours,
			businessHours,
			requireSeating,
			requirePrepaid,
		} = body;

		if (!body.name) {
			return new NextResponse("Name is required", { status: 403 });
		}

		/*
	const locale = await prismadb.locale.findUnique({ where: { id: defaultLocale } });
	const defaultCurrency = locale?.defaultCurrencyId;
	*/

		const store = await sqlClient.store.update({
			where: {
				id: params.storeId,
				ownerId: userId,
			},
			data: {
				name,
				defaultLocale,
				defaultCountry,
				defaultCurrency,
				autoAcceptOrder,
				acceptAnonymousOrder,
				useBusinessHours,
				isOpen,
				requireSeating,
				requirePrepaid,
				updatedAt: getUtcNowEpoch(),
				/*
		storeLocales: {
		  upsert: {
			// create or update storeLocale record
			create: { localeId: defaultLocale! },
			update: { localeId: defaultLocale! },
			where: { storeId_localeId: { storeId: params.storeId, localeId: defaultLocale } },
		  },
		},
		*/
			},
		});

		await sqlClient.storeSettings.upsert({
			where: {
				storeId: params.storeId,
			},
			update: {
				orderNoteToCustomer,
				businessHours,
				updatedAt: getUtcNowEpoch(),
			},
			create: {
				orderNoteToCustomer,
				businessHours,
				storeId: params.storeId,
				createdAt: getUtcNowEpoch(),
				updatedAt: getUtcNowEpoch(),
			},
		});

		transformPrismaDataForJson(store);
		return NextResponse.json(store);
	} catch (error) {
		logger.info("store patch", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}

export async function DELETE(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		// once we pass this point, the user is the store owner and is authenticated
		CheckStoreAdminApiAccess(params.storeId);

		// get the userId
		const session = await auth.api.getSession({
			headers: await headers(), // you need to pass the headers object.
		});
		const userId = session?.user.id;

		if (typeof userId !== "string") {
			return new NextResponse("Unauthenticated", { status: 400 });
		}

		// make sure store belongs to the user
		const storeToUpdate = await sqlClient.store.findUnique({
			where: {
				id: params.storeId,
				ownerId: userId,
			},
			include: {
				//Categories: true,
				//StoreAnnouncement: true,
				//Owner: true,
				Products: true,
				StoreOrders: true,
				//StoreShippingMethods: true,
				//StorePaymentMethods: true,
			},
		});

		if (!storeToUpdate) {
			return new NextResponse("error", { status: 402 });
		}

		// delete the store if no order exists.
		if (storeToUpdate.StoreOrders.length === 0) {
			const storeSetting = await sqlClient.storeSettings.findFirst({
				where: {
					storeId: storeToUpdate.id,
				},
			});

			if (storeSetting) {
				/*
				try {
					await sqlClient.address.delete({
						where: {
							storeSettingsId: storeSetting.id,
						},
					});
				} catch (error) {
					logger.info("Operation log", {
						metadata: {
							error: error instanceof Error ? error.message : String(error),
						},
						tags: ["api"],
					});
				}
		  */

				await sqlClient.storeSettings.delete({
					where: {
						storeId: storeToUpdate.id,
					},
				});
			}

			await sqlClient.storePaymentMethodMapping.deleteMany({
				where: {
					storeId: params.storeId,
				},
			});
			await sqlClient.storeShipMethodMapping.deleteMany({
				where: {
					storeId: params.storeId,
				},
			});

			const store = await sqlClient.store.delete({
				where: {
					id: params.storeId,
				},
			});

			transformPrismaDataForJson(store);
			return NextResponse.json(store);
		}

		// otherwise mark the store as deleted only
		const store = await sqlClient.store.update({
			where: {
				id: params.storeId,
			},
			data: {
				isDeleted: true,
			},
		});

		transformPrismaDataForJson(store);
		return NextResponse.json(store);
	} catch (error) {
		logger.info("store delete", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});

		return new NextResponse("Internal error", { status: 500 });
	}
}
