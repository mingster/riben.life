"use client";

import { useState, useEffect, useCallback } from "react";
import {
	getGeoLocation,
	type GeoLocation,
	isGeoError,
	getCountryCode,
	getTimezone,
	getCoordinates,
	getFormattedLocation,
	isUserInCountry,
	isUserInContinent,
} from "@/utils/geo-ip";

interface UseGeoIPOptions {
	/** Auto-fetch geo location on mount */
	autoFetch?: boolean;
	/** Custom IP address to lookup */
	ip?: string;
	/** Cache duration in milliseconds (default: 24 hours) */
	cacheDuration?: number;
}

interface UseGeoIPReturn {
	/** Current geo location data */
	data: GeoLocation | null;
	/** Error information if lookup failed */
	error: string | null;
	/** Loading state */
	isLoading: boolean;
	/** Whether the lookup was successful */
	isSuccess: boolean;
	/** Whether an error occurred */
	isError: boolean;
	/** Manual trigger to fetch geo location */
	refetch: () => Promise<void>;
	/** Get country code from current location */
	getCountryCode: () => string | null;
	/** Get timezone from current location */
	getTimezone: () => string | null;
	/** Get coordinates from current location */
	getCoordinates: () => { lat: number; lng: number } | null;
	/** Get formatted location string */
	getFormattedLocation: () => string;
	/** Check if user is in a specific country */
	isUserInCountry: (countryCode: string) => boolean;
	/** Check if user is in a specific continent */
	isUserInContinent: (continentCode: string) => boolean;
}

/**
 * React hook for IP geolocation
 *
 * @param options Configuration options
 * @returns Geo IP data and utility functions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data, isLoading, error, isUserInCountry } = useGeoIP();
 *
 *   if (isLoading) return <div>Loading location...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *
 *   return (
 *     <div>
 *       <p>You are in: {data?.city}, {data?.country}</p>
 *       {isUserInCountry('US') && <p>Welcome US user!</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useGeoIP(options: UseGeoIPOptions = {}): UseGeoIPReturn {
	const { autoFetch = true, ip, cacheDuration } = options;

	const [data, setData] = useState<GeoLocation | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [isError, setIsError] = useState(false);

	const fetchGeoLocation = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		setIsSuccess(false);
		setIsError(false);

		try {
			const result = await getGeoLocation(ip);

			if (isGeoError(result)) {
				setError(result.message);
				setIsError(true);
				setData(null);
			} else {
				setData(result);
				setIsSuccess(true);
				setError(null);
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Unknown error occurred";
			setError(errorMessage);
			setIsError(true);
			setData(null);
		} finally {
			setIsLoading(false);
		}
	}, [ip]);

	// Auto-fetch on mount if enabled
	useEffect(() => {
		if (autoFetch) {
			fetchGeoLocation();
		}
	}, [autoFetch, fetchGeoLocation]);

	// Utility functions that work with current data
	const getCountryCodeFromData = useCallback(() => {
		return data ? getCountryCode(data) : null;
	}, [data]);

	const getTimezoneFromData = useCallback(() => {
		return data ? getTimezone(data) : null;
	}, [data]);

	const getCoordinatesFromData = useCallback(() => {
		return data ? getCoordinates(data) : null;
	}, [data]);

	const getFormattedLocationFromData = useCallback(() => {
		return data ? getFormattedLocation(data) : "Unknown location";
	}, [data]);

	const isUserInCountryFromData = useCallback(
		(countryCode: string) => {
			return data ? isUserInCountry(data, countryCode) : false;
		},
		[data],
	);

	const isUserInContinentFromData = useCallback(
		(continentCode: string) => {
			return data ? isUserInContinent(data, continentCode) : false;
		},
		[data],
	);

	return {
		data,
		error,
		isLoading,
		isSuccess,
		isError,
		refetch: fetchGeoLocation,
		getCountryCode: getCountryCodeFromData,
		getTimezone: getTimezoneFromData,
		getCoordinates: getCoordinatesFromData,
		getFormattedLocation: getFormattedLocationFromData,
		isUserInCountry: isUserInCountryFromData,
		isUserInContinent: isUserInContinentFromData,
	};
}

/**
 * Hook for getting geo location with automatic refetch on IP change
 */
export function useGeoIPWithIP(ip?: string) {
	return useGeoIP({ autoFetch: true, ip });
}

/**
 * Hook for manual geo location fetching
 */
export function useGeoIPManual() {
	return useGeoIP({ autoFetch: false });
}
