import type { Address, Country } from "@prisma/client";

export type AddressWithCountry = Address & { Country: Country };

/**
 * Persist a machine-readable shipping snapshot on {@link StoreOrder.shippingAddress}.
 */
export function serializeAddressSnapshot(addr: AddressWithCountry): string {
	return JSON.stringify({
		firstName: addr.firstName,
		lastName: addr.lastName,
		company: addr.company,
		streetLine1: addr.streetLine1,
		streetLine2: addr.streetLine2,
		city: addr.city,
		district: addr.district,
		province: addr.province,
		postalCode: addr.postalCode,
		countryId: addr.countryId,
		countryName: addr.Country?.name ?? addr.countryId,
		phoneNumber: addr.phoneNumber,
	});
}

export interface ShippingInlinePayload {
	firstName: string;
	lastName: string;
	streetLine1: string;
	city: string;
	province?: string;
	postalCode?: string;
	countryId: string;
	phoneNumber: string;
}

export function serializeInlineShippingSnapshot(
	payload: ShippingInlinePayload,
	countryName: string,
): string {
	return JSON.stringify({
		firstName: payload.firstName,
		lastName: payload.lastName,
		streetLine1: payload.streetLine1,
		city: payload.city,
		province: payload.province ?? "",
		postalCode: payload.postalCode ?? "",
		countryId: payload.countryId,
		countryName,
		phoneNumber: payload.phoneNumber,
		source: "inline_checkout",
	});
}
