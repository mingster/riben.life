import type { Prisma } from "@prisma/client";

export interface StorefrontPickupLocation {
	id: string;
	name: string;
	line1: string;
	city: string;
	country?: string;
	hours?: string;
}

export function parseStorefrontPickupLocationsJson(
	raw: string | null | undefined,
): StorefrontPickupLocation[] {
	if (!raw || raw.trim() === "") {
		return [];
	}
	try {
		const v: unknown = JSON.parse(raw);
		if (!Array.isArray(v)) {
			return [];
		}
		const out: StorefrontPickupLocation[] = [];
		for (const item of v) {
			if (typeof item !== "object" || item === null) {
				continue;
			}
			const o = item as Record<string, unknown>;
			const id = typeof o.id === "string" ? o.id : "";
			const name = typeof o.name === "string" ? o.name : "";
			const line1 = typeof o.line1 === "string" ? o.line1 : "";
			const city = typeof o.city === "string" ? o.city : "";
			if (!id || !name || !line1 || !city) {
				continue;
			}
			out.push({
				id,
				name,
				line1,
				city,
				country: typeof o.country === "string" ? o.country : undefined,
				hours: typeof o.hours === "string" ? o.hours : undefined,
			});
		}
		return out;
	} catch {
		return [];
	}
}

export function findStorefrontPickupLocation(
	locations: StorefrontPickupLocation[],
	id: string,
): StorefrontPickupLocation | undefined {
	return locations.find((l) => l.id === id);
}

export function serializePickupSnapshot(loc: StorefrontPickupLocation): string {
	return JSON.stringify({
		type: "pickup",
		locationId: loc.id,
		name: loc.name,
		streetLine1: loc.line1,
		city: loc.city,
		countryName: loc.country ?? "",
		hours: loc.hours ?? "",
	});
}

export interface ShippingQuoteInput {
	fulfillmentType: "ship" | "pickup";
	subtotalMajor: number;
	baseShippingMajor: number;
	freeShippingMinimum: Prisma.Decimal | number | null | undefined;
}

export function quoteStorefrontShipping(input: ShippingQuoteInput): {
	shippingMajor: number;
	freeShippingApplied: boolean;
} {
	if (input.fulfillmentType === "pickup") {
		return { shippingMajor: 0, freeShippingApplied: false };
	}
	const raw = input.freeShippingMinimum;
	const min = raw !== null && raw !== undefined ? Number(raw) : null;
	if (min !== null && min > 0 && input.subtotalMajor + 1e-9 >= min) {
		return { shippingMajor: 0, freeShippingApplied: true };
	}
	return {
		shippingMajor: input.baseShippingMajor,
		freeShippingApplied: false,
	};
}
