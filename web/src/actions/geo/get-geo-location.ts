"use server";

import { baseClient } from "@/utils/actions/safe-action";
import { z } from "zod";
import {
	getGeoLocation,
	isGeoError,
	getTimezone,
	getCoordinates,
	getFormattedLocation,
	isUserInCountry,
	isUserInContinent,
	clearGeoCache,
	getGeoCacheStats,
} from "@/utils/geo-ip";
import logger from "@/lib/logger";

// Validation schema for getting geo location by IP
const getGeoLocationSchema = z.object({
	ip: z.string().optional(),
});

// Validation schema for checking if user is in a specific country
const checkCountrySchema = z.object({
	ip: z.string().optional(),
	countryCode: z.string().min(2).max(3),
});

// Validation schema for checking if user is in a specific continent
const checkContinentSchema = z.object({
	ip: z.string().optional(),
	continentCode: z.string().min(2).max(3),
});

// Validation schema for getting formatted location
const getFormattedLocationSchema = z.object({
	ip: z.string().optional(),
});

/**
 * Get geo location for an IP address
 */
export const getGeoLocationAction = baseClient
	.metadata({ name: "getGeoLocation" })
	.schema(getGeoLocationSchema)
	.action(
		async ({
			parsedInput,
		}: {
			parsedInput: z.infer<typeof getGeoLocationSchema>;
		}) => {
			try {
				const result = await getGeoLocation(parsedInput.ip);

				if (isGeoError(result)) {
					return { serverError: result.message };
				}

				return { data: result };
			} catch (error) {
				logger.error(
					`Geo location action error: ${error instanceof Error ? error.message : String(error)}`,
					{
						metadata: {
							ip: parsedInput.ip,
							error: error instanceof Error ? error.message : String(error),
						},
						message: "Failed to get geo location",
						tags: ["geo", "location", "error"],
						service: "getGeoLocation",
						environment: process.env.NODE_ENV,
						version: process.env.npm_package_version,
					},
				);
				return {
					serverError:
						error instanceof Error
							? error.message
							: "Failed to get geo location",
				};
			}
		},
	);

/**
 * Check if user is in a specific country
 */
export const isUserInCountryAction = baseClient
	.metadata({ name: "isUserInCountry" })
	.schema(checkCountrySchema)
	.action(async ({ parsedInput }) => {
		try {
			const result = await getGeoLocation(parsedInput.ip);

			if (isGeoError(result)) {
				return { serverError: result.message };
			}

			const isInCountry = isUserInCountry(result, parsedInput.countryCode);

			return {
				data: {
					isInCountry,
					countryCode: result.countryCode,
					country: result.country,
				},
			};
		} catch (error) {
			logger.error(
				`Check country action error: ${error instanceof Error ? error.message : String(error)}`,
				{
					metadata: {
						ip: parsedInput.ip,
						countryCode: parsedInput.countryCode,
					},
					message: "Failed to check country",
					service: "isUserInCountry",
					environment: process.env.NODE_ENV,
					version: process.env.npm_package_version,
					tags: ["geo", "country", "error"],
				},
			);
			return {
				serverError:
					error instanceof Error ? error.message : "Failed to check country",
			};
		}
	});

/**
 * Check if user is in a specific continent
 */
export const isUserInContinentAction = baseClient
	.metadata({ name: "isUserInContinent" })
	.schema(checkContinentSchema)
	.action(async ({ parsedInput }) => {
		try {
			const result = await getGeoLocation(parsedInput.ip);

			if (isGeoError(result)) {
				return { serverError: result.message };
			}

			const isInContinent = isUserInContinent(
				result,
				parsedInput.continentCode,
			);

			return {
				data: {
					isInContinent,
					continentCode: result.continentCode,
					continent: result.continent,
				},
			};
		} catch (error) {
			logger.error(
				`Check continent action error: ${error instanceof Error ? error.message : String(error)}`,
				{
					metadata: {
						ip: parsedInput.ip,
						continentCode: parsedInput.continentCode,
					},
					message: "Failed to check continent",
					service: "isUserInContinent",
					environment: process.env.NODE_ENV,
					version: process.env.npm_package_version,
					tags: ["geo", "continent", "error"],
				},
			);
			return {
				serverError:
					error instanceof Error ? error.message : "Failed to check continent",
			};
		}
	});

/**
 * Get formatted location string
 */
export const getFormattedLocationAction = baseClient
	.metadata({ name: "getFormattedLocation" })
	.schema(getFormattedLocationSchema)
	.action(async ({ parsedInput }) => {
		try {
			const result = await getGeoLocation(parsedInput.ip);

			if (isGeoError(result)) {
				return { serverError: result.message };
			}

			const formattedLocation = getFormattedLocation(result);

			return {
				data: {
					formattedLocation,
					city: result.city,
					region: result.region,
					country: result.country,
					countryCode: result.countryCode,
				},
			};
		} catch (error) {
			logger.error(`Get formatted location action error`, {
				metadata: {
					ip: parsedInput.ip,
					error: error instanceof Error ? error.message : String(error),
				},
				message: "Failed to get formatted location",
				service: "getFormattedLocation",
				environment: process.env.NODE_ENV,
				version: process.env.npm_package_version,
				tags: ["geo", "formatted-location", "error"],
			});
			return {
				serverError:
					error instanceof Error
						? error.message
						: "Failed to get formatted location",
			};
		}
	});

/**
 * Get timezone for an IP address
 */
export const getTimezoneAction = baseClient
	.metadata({ name: "getTimezone" })
	.schema(getGeoLocationSchema)
	.action(async ({ parsedInput }) => {
		try {
			const result = await getGeoLocation(parsedInput.ip);

			if (isGeoError(result)) {
				return { serverError: result.message };
			}

			const timezone = getTimezone(result);

			return {
				data: {
					timezone,
					city: result.city,
					country: result.country,
				},
			};
		} catch (error) {
			logger.error(`Get timezone action error`, {
				metadata: {
					ip: parsedInput.ip,
					error: error instanceof Error ? error.message : String(error),
				},
				message: "Failed to get timezone",
				tags: ["geo", "timezone", "error"],
				service: "getTimezone",
				environment: process.env.NODE_ENV,
				version: process.env.npm_package_version,
			});
			return {
				serverError:
					error instanceof Error ? error.message : "Failed to get timezone",
			};
		}
	});

/**
 * Get coordinates for an IP address
 */
export const getCoordinatesAction = baseClient
	.metadata({ name: "getCoordinates" })
	.schema(getGeoLocationSchema)
	.action(async ({ parsedInput }) => {
		try {
			const result = await getGeoLocation(parsedInput.ip);

			if (isGeoError(result)) {
				return { serverError: result.message };
			}

			const coordinates = getCoordinates(result);

			return {
				data: {
					coordinates,
					city: result.city,
					country: result.country,
				},
			};
		} catch (error) {
			logger.error(`Get coordinates action error`, {
				metadata: {
					ip: parsedInput.ip,
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["geo", "coordinates", "error"],
				message: "Failed to get coordinates",
				service: "getCoordinates",
				environment: process.env.NODE_ENV,
				version: process.env.npm_package_version,
			});
			return {
				serverError:
					error instanceof Error ? error.message : "Failed to get coordinates",
			};
		}
	});

/**
 * Clear geo location cache
 */
export const clearGeoCacheAction = baseClient
	.metadata({ name: "clearGeoCache" })
	.action(async () => {
		try {
			clearGeoCache();
			return { data: { success: true, message: "Cache cleared successfully" } };
		} catch (error) {
			logger.error(`Clear cache action error`, {
				message: "Failed to clear cache",
				tags: ["geo", "cache", "error"],
				service: "clearGeoCache",
				metadata: {
					error: error instanceof Error ? error.message : String(error),
				},
				environment: process.env.NODE_ENV,
				version: process.env.npm_package_version,
			});
			return {
				serverError:
					error instanceof Error ? error.message : "Failed to clear cache",
			};
		}
	});

/**
 * Get geo location cache statistics
 */
export const getGeoCacheStatsAction = baseClient
	.metadata({ name: "getGeoCacheStats" })
	.action(async () => {
		try {
			const stats = getGeoCacheStats();
			return { data: stats };
		} catch (error) {
			logger.error(`Get cache stats action error`, {
				tags: ["geo", "cache", "stats", "error"],
				message: "Failed to get cache statistics",
				service: "getGeoCacheStats",
				metadata: {
					error: error instanceof Error ? error.message : String(error),
				},
				environment: process.env.NODE_ENV,
				version: process.env.npm_package_version,
			});
			return {
				serverError:
					error instanceof Error
						? error.message
						: "Failed to get cache statistics",
			};
		}
	});
