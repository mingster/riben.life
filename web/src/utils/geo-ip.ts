/**
 * Geo IP Utility
 *
 * Provides IP geolocation functionality using free services with fallbacks.
 * Supports both client-side and server-side usage.
 */

import { getClientIPAddress } from "@/actions/server-util";
import logger from "@/lib/logger";

export interface GeoLocation {
	ip: string;
	country: string;
	countryCode: string;
	region: string;
	regionCode: string;
	city: string;
	timezone: string;
	latitude: number;
	longitude: number;
	isp?: string;
	org?: string;
	as?: string;
	asname?: string;
	zip?: string;
	continent?: string;
	continentCode?: string;
}

export interface GeoIPError {
	error: string;
	message: string;
	code?: string;
}

export type GeoIPResult = GeoLocation | GeoIPError;

// Cache for storing geo location data
const geoCache = new Map<string, { data: GeoLocation; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Polyfill for AbortSignal.timeout() to support older iOS versions
 * AbortSignal.timeout() requires iOS 16.4+, this polyfill works on iOS 13+
 */
function createAbortSignal(timeoutMs: number): AbortSignal {
	// Use native AbortSignal.timeout if available (iOS 16.4+)
	if (
		typeof AbortSignal !== "undefined" &&
		"timeout" in AbortSignal &&
		typeof AbortSignal.timeout === "function"
	) {
		return AbortSignal.timeout(timeoutMs);
	}

	// Polyfill for older iOS versions
	const controller = new AbortController();
	const timeoutId = setTimeout(() => {
		controller.abort();
	}, timeoutMs);

	// Clean up timeout if signal is already aborted
	if (controller.signal.aborted) {
		clearTimeout(timeoutId);
	} else {
		// Store timeout ID for cleanup (if needed)
		(controller.signal as any)._timeoutId = timeoutId;
	}

	return controller.signal;
}

/**
 * Get client IP address from request headers.
 * NOTE this won't work for server side. Use getClientIPAddress() instead.
 */
export function getClientIP(
	headers: Headers | Record<string, string | string[] | undefined>,
): string | null {
	// Common headers for client IP (check both lowercase and original case)
	const ipHeaders = [
		"x-forwarded-for",
		"x-real-ip",
		"x-client-ip",
		"cf-connecting-ip", // Cloudflare
		"x-forwarded",
		"forwarded-for",
		"forwarded",
		// Also check uppercase versions
		"X-Forwarded-For",
		"X-Real-IP",
		"X-Client-IP",
		"CF-Connecting-IP",
		"X-Forwarded",
		"Forwarded-For",
		"Forwarded",
	];

	// Handle Headers object (Next.js)
	if (headers instanceof Headers) {
		// Debug: Log all available headers
		const allHeaders: Record<string, string> = {};
		headers.forEach((value, key) => {
			allHeaders[key] = value;
		});
		//logger.info(`Available headers: ${JSON.stringify(allHeaders)}`);

		for (const header of ipHeaders) {
			const value = headers.get(header);

			if (value) {
				//logger.info(`Found IP header ${header}: ${value}`);
				// Handle localhost addresses
				if (isLocalhost(value)) {
					//logger.info(`Localhost IP detected: ${value}`);
					return "127.0.0.1";
				}

				// Extract first IP if comma-separated
				const cleanIP = value.split(",")[0].trim();
				if (isValidIP(cleanIP)) {
					//logger.info(`Valid IP found in headers: ${cleanIP}`);
					return cleanIP;
				}
			}
		}

		// Fallback: Check for any header that might contain an IP
		for (const [key, value] of headers.entries()) {
			if (
				key.toLowerCase().includes("ip") ||
				key.toLowerCase().includes("forwarded")
			) {
				//logger.info(`Checking potential IP header ${key}: ${value}`);
				if (value && typeof value === "string") {
					// Try to extract IP from the value
					const ipMatch = value.match(
						/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/,
					);
					if (ipMatch) {
						const ip = ipMatch[0];
						if (!isLocalhost(ip)) {
							//logger.info(`Found IP in header ${key}: ${ip}`);
							return ip;
						}
					}
				}
			}
		}
	} else {
		// Handle Record<string, string | string[] | undefined>
		const headersRecord = headers as Record<
			string,
			string | string[] | undefined
		>;

		// Log all available headers for debugging
		//logger.info(`Available headers: ${JSON.stringify(headersRecord)}`);

		for (const header of ipHeaders) {
			const value = headersRecord[header];

			if (value) {
				//logger.info(`Found IP header ${header}: ${value}`);
				// Handle array of strings
				const ip = Array.isArray(value) ? value[0] : value;
				if (ip && typeof ip === "string") {
					// Handle localhost addresses
					if (isLocalhost(ip)) {
						//logger.info(`Localhost IP detected: ${ip}`);
						return "127.0.0.1";
					}

					// Extract first IP if comma-separated
					const cleanIP = ip.split(",")[0].trim();
					if (isValidIP(cleanIP)) {
						//logger.info(`Valid IP found in headers: ${cleanIP}`);
						return cleanIP;
					}
				}
			}
		}

		// Fallback: Check for any header that might contain an IP
		for (const [key, value] of Object.entries(headersRecord)) {
			if (
				key.toLowerCase().includes("ip") ||
				key.toLowerCase().includes("forwarded")
			) {
				//logger.info(`Checking potential IP header ${key}: ${value}`);
				if (value && typeof value === "string") {
					// Try to extract IP from the value
					const ipMatch = value.match(
						/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/,
					);
					if (ipMatch) {
						const ip = ipMatch[0];
						if (!isLocalhost(ip)) {
							//logger.info(`Found IP in header ${key}: ${ip}`);
							return ip;
						}
					}
				}
			}
		}
	}

	logger.warn("No IP found in headers", {
		message: "No IP found in headers",
		tags: ["getClientIPAddress"],
		service: "geo-ip",
		environment: process.env.NODE_ENV,
		version: process.env.npm_package_version,
	});
	return null;
}

/**
 * Get client IP address specifically for server actions
 * This function tries multiple approaches to get the client IP
 */
export async function getClientIPForServerAction(): Promise<string> {
	try {
		// Try to get headers from Next.js
		//const headersList = await import("next/headers").then((m) => m.headers());

		// First try from server side header
		const ip = await getClientIPAddress();
		if (ip) {
			//logger.info(`IP found via headers: ${ip}`);
			return ip;
		}

		// If no IP found, try alternative approaches
		logger.warn("No IP found in headers, trying alternative approaches", {
			tags: ["getClientIPForServerAction"],
			service: "geo-ip",
			environment: process.env.NODE_ENV,
			version: process.env.npm_package_version,
		});

		// Try to get IP from environment variables that might be set by the proxy/load balancer
		const envIP =
			process.env.CLIENT_IP ||
			process.env.REMOTE_ADDR ||
			process.env.HTTP_X_FORWARDED_FOR ||
			process.env.HTTP_X_REAL_IP ||
			process.env.HTTP_CF_CONNECTING_IP;

		if (envIP) {
			// Clean up the IP if it's comma-separated
			const cleanIP = envIP.split(",")[0].trim();
			if (isValidIP(cleanIP)) {
				//logger.info(`IP found in environment: ${cleanIP}`);
				return cleanIP;
			}
		}

		// Check if we're in development mode
		if (process.env.NODE_ENV === "development") {
			//logger.info("Development mode: Using localhost IP");
			return "127.0.0.1";
		}

		// Try to make an external request to get our own IP (fallback)
		try {
			const response = await fetch("https://api.ipify.org?format=json", {
				signal: createAbortSignal(3000),
			});
			if (response.ok) {
				const data = await response.json();
				if (data.ip && isValidIP(data.ip)) {
					//logger.info(`IP found via external service: ${data.ip}`);
					return data.ip;
				}
			}
		} catch (error) {
			logger.warn("Failed to get IP from external service", {
				message: "Failed to get IP from external service",
				metadata: {
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["getClientIPForServerAction"],
				service: "geo-ip",
				environment: process.env.NODE_ENV,
				version: process.env.npm_package_version,
			});
		}

		// Last resort: use a default IP
		logger.warn("No IP found, using default IP", {
			message: "No IP found, using default IP",
			tags: ["getClientIPForServerAction"],
			service: "geo-ip",
			environment: process.env.NODE_ENV,
			version: process.env.npm_package_version,
		});
		return "0.0.0.0";
	} catch (error) {
		logger.error("Error getting client IP", {
			message: "Error getting client IP",
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["getClientIPForServerAction"],
			service: "geo-ip",
			environment: process.env.NODE_ENV,
			version: process.env.npm_package_version,
		});
		return "0.0.0.0";
	}
}

/**
 * Validate IP address format
 */
export function isValidIP(ip: string): boolean {
	// IPv4 validation
	const ipv4Regex =
		/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

	// IPv6 validation (basic)
	const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;

	return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Check if IP is private/local
 */
export function isPrivateIP(ip: string): boolean {
	const privateRanges = [
		/^10\./, // 10.0.0.0/8
		/^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
		/^192\.168\./, // 192.168.0.0/16
		/^127\./, // 127.0.0.0/8 (localhost)
		/^169\.254\./, // 169.254.0.0/16 (link-local)
		/^::1$/, // IPv6 localhost
		/^fe80:/, // IPv6 link-local
		/^fc00:/, // IPv6 unique local
		/^fd00:/, // IPv6 unique local
	];

	return privateRanges.some((range) => range.test(ip));
}

/**
 * Check if IP is localhost
 */
export function isLocalhost(ip: string): boolean {
	const localhostPatterns = [
		/^127\./, // IPv4 localhost (127.0.0.0/8)
		/^::1$/, // IPv6 localhost
		/^localhost$/, // Hostname localhost
		/^0\.0\.0\.0$/, // All interfaces
	];

	return localhostPatterns.some((pattern) => pattern.test(ip));
}

/**
 * Get geo location from IP using ipapi.co (free tier)
 */
async function getGeoFromIPAPI(ip: string): Promise<GeoLocation | null> {
	try {
		const response = await fetch(`https://ipapi.co/${ip}/json/`, {
			headers: {
				"User-Agent": "PSTV-Web/1.0",
			},
			signal: createAbortSignal(5000), // 5 second timeout
		});

		if (!response.ok) {
			return null;
		}

		const data = await response.json();

		if (data.error) {
			return null;
		}

		return {
			ip: data.ip || ip,
			country: data.country_name || "",
			countryCode: data.country_code || "",
			region: data.region || "",
			regionCode: data.region_code || "",
			city: data.city || "",
			timezone: data.timezone || "",
			latitude: parseFloat(data.latitude) || 0,
			longitude: parseFloat(data.longitude) || 0,
			isp: data.org || "",
			org: data.org || "",
			as: data.asn || "",
			asname: data.asn || "",
			zip: data.postal || "",
			continent: data.continent_name || "",
			continentCode: data.continent_code || "",
		};
	} catch (error) {
		logger.warn(
			`Failed to get geo data from ipapi.co: ${error instanceof Error ? error.message : String(error)}`,
			{
				metadata: { ip },
				tags: ["geo-ip", "ipapi.co", "error"],
			},
		);
		return null;
	}
}

/**
 * Get geo location from IP using ip-api.com (free tier)
 */
async function getGeoFromIPAPICom(ip: string): Promise<GeoLocation | null> {
	try {
		const response = await fetch(
			`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,timezone,lat,lon,isp,org,as,asname,zip,continent,continentCode,query`,
			{
				signal: createAbortSignal(5000), // 5 second timeout
			},
		);

		if (!response.ok) {
			return null;
		}

		const data = await response.json();

		if (data.status !== "success") {
			return null;
		}

		return {
			ip: data.query || ip,
			country: data.country || "",
			countryCode: data.countryCode || "",
			region: data.regionName || "",
			regionCode: data.region || "",
			city: data.city || "",
			timezone: data.timezone || "",
			latitude: parseFloat(data.lat) || 0,
			longitude: parseFloat(data.lon) || 0,
			isp: data.isp || "",
			org: data.org || "",
			as: data.as || "",
			asname: data.asname || "",
			zip: data.zip || "",
			continent: data.continent || "",
			continentCode: data.continentCode || "",
		};
	} catch (error) {
		logger.warn(
			`Failed to get geo data from ip-api.com: ${error instanceof Error ? error.message : String(error)}`,
			{
				metadata: { ip },
				tags: ["geo-ip", "ip-api.com", "error"],
			},
		);
		return null;
	}
}

/**
 * Get geo location from IP using multiple services with fallback
 */
export async function getGeoLocation(ip?: string): Promise<GeoIPResult> {
	try {
		// If no IP provided, try to get it from client
		if (!ip) {
			if (typeof window !== "undefined") {
				// Client-side: use a service to get the client's IP
				try {
					const response = await fetch("https://api.ipify.org?format=json", {
						signal: createAbortSignal(3000),
					});
					if (response.ok) {
						const data = await response.json();
						ip = data.ip;
					}
				} catch (error) {
					logger.warn(
						`Failed to get client IP: ${error instanceof Error ? error.message : String(error)}`,
						{
							metadata: { ip },
							tags: ["geo-ip", "ipify", "error"],
						},
					);
					return {
						error: "IP_DETECTION_FAILED",
						message: "Unable to detect client IP address",
					};
				}
			} else {
				return {
					error: "IP_REQUIRED",
					message: "IP address is required for server-side usage",
				};
			}
		}

		if (!ip || !isValidIP(ip)) {
			return {
				error: "INVALID_IP",
				message: "Invalid IP address provided",
			};
		}

		// Handle localhost addresses
		if (isLocalhost(ip)) {
			//logger.info(`Localhost IP detected: ${ip}, skipping geo lookup`);
			return {
				ip: ip,
				country: "Local",
				countryCode: "LOCAL",
				region: "Development",
				regionCode: "DEV",
				city: "Localhost",
				timezone: "UTC",
				latitude: 0,
				longitude: 0,
				isp: "Local Development",
				org: "Local Development",
				as: "LOCAL",
				asname: "Local Development",
				zip: "",
				continent: "Local",
				continentCode: "LOCAL",
			};
		}

		// Check cache first
		const cached = geoCache.get(ip);
		if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
			return cached.data;
		}

		// Try ipapi.co first
		let geoData = await getGeoFromIPAPI(ip);

		// Fallback to ip-api.com
		if (!geoData) {
			geoData = await getGeoFromIPAPICom(ip);
		}

		if (!geoData) {
			return {
				error: "GEO_LOOKUP_FAILED",
				message: "Unable to retrieve geo location data",
			};
		}

		// Cache the result
		geoCache.set(ip, { data: geoData, timestamp: Date.now() });

		return geoData;
	} catch (error) {
		logger.error(
			`Geo IP lookup error: ${error instanceof Error ? error.message : String(error)}`,
			{
				metadata: { ip },
				tags: ["geo-ip", "error"],
				service: "getGeoLocation",
				environment: process.env.NODE_ENV,
				version: process.env.npm_package_version,
			},
		);
		return {
			error: "UNKNOWN_ERROR",
			message: "An unexpected error occurred during geo lookup",
		};
	}
}

/**
 * Get geo location from request headers (server-side)
 */
export async function getGeoLocationFromRequest(
	headers: Headers | Record<string, string | string[] | undefined>,
): Promise<GeoIPResult> {
	const ip = getClientIP(headers);

	if (!ip) {
		return {
			error: "IP_NOT_FOUND",
			message: "Could not extract IP address from request headers",
		};
	}

	return getGeoLocation(ip);
}

/**
 * Check if geo location result is an error
 */
export function isGeoError(result: GeoIPResult): result is GeoIPError {
	return "error" in result;
}

/**
 * Get country code from geo location
 */
export function getCountryCode(result: GeoIPResult): string | null {
	if (isGeoError(result)) {
		return null;
	}
	return result.countryCode || null;
}

/**
 * Get timezone from geo location
 */
export function getTimezone(result: GeoIPResult): string | null {
	if (isGeoError(result)) {
		return null;
	}
	return result.timezone || null;
}

/**
 * Get coordinates from geo location
 */
export function getCoordinates(
	result: GeoIPResult,
): { lat: number; lng: number } | null {
	if (isGeoError(result)) {
		return null;
	}
	return {
		lat: result.latitude,
		lng: result.longitude,
	};
}

/**
 * Clear geo location cache
 */
export function clearGeoCache(): void {
	geoCache.clear();
}

/**
 * Get cache statistics
 */
export function getGeoCacheStats(): {
	size: number;
	entries: Array<{ ip: string; age: number }>;
} {
	const now = Date.now();
	const entries = Array.from(geoCache.entries()).map(([ip, { timestamp }]) => ({
		ip,
		age: now - timestamp,
	}));

	return {
		size: geoCache.size,
		entries,
	};
}

/**
 * Check if user is in a specific country
 */
export function isUserInCountry(
	result: GeoIPResult,
	countryCode: string,
): boolean {
	if (isGeoError(result)) {
		return false;
	}
	return result.countryCode?.toUpperCase() === countryCode.toUpperCase();
}

/**
 * Check if user is in a specific region/continent
 */
export function isUserInContinent(
	result: GeoIPResult,
	continentCode: string,
): boolean {
	if (isGeoError(result)) {
		return false;
	}
	return result.continentCode?.toUpperCase() === continentCode.toUpperCase();
}

/**
 * Get formatted location string
 */
export function getFormattedLocation(result: GeoIPResult): string {
	if (isGeoError(result)) {
		return "Unknown location";
	}

	const parts = [result.city, result.region, result.country].filter(Boolean);

	return parts.join(", ") || "Unknown location";
}

/**
 * Get distance between two coordinates in kilometers
 */
export function getDistance(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number,
): number {
	const R = 6371; // Earth's radius in kilometers
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLng = ((lng2 - lng1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLng / 2) *
			Math.sin(dLng / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

/**
 * Check if two locations are within a certain distance
 */
export function isWithinDistance(
	result1: GeoIPResult,
	result2: GeoIPResult,
	maxDistanceKm: number,
): boolean {
	if (isGeoError(result1) || isGeoError(result2)) {
		return false;
	}

	const distance = getDistance(
		result1.latitude,
		result1.longitude,
		result2.latitude,
		result2.longitude,
	);

	return distance <= maxDistanceKm;
}
