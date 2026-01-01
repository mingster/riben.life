import logger from "@/lib/logger";
import { maskPhoneNumber } from "@/utils/utils";
import { getT } from "@/app/i18n";

interface RateLimitCheck {
	phoneNumber?: string;
	ipAddress?: string;
	locale?: string; // Optional locale for i18n (e.g., "en", "tw", "jp")
}

interface RateLimitResult {
	allowed: boolean;
	message?: string;
	retryAfter?: number; // seconds
}

// In-memory cache for rate limiting (or use Redis in production)
const rateLimitCache = new Map<string, number[]>();

export async function checkRateLimit({
	phoneNumber,
	ipAddress,
	locale,
}: RateLimitCheck): Promise<RateLimitResult> {
	const now = Date.now();
	const windows = [
		{ duration: 15 * 60 * 1000, max: 3 }, // 15 minutes, 3 requests
		{ duration: 60 * 60 * 1000, max: 5 }, // 1 hour, 5 requests
		{ duration: 24 * 60 * 60 * 1000, max: 10 }, // 24 hours, 10 requests
	];

	// Check phone number rate limit
	if (phoneNumber) {
		const phoneKey = `phone:${phoneNumber}`;
		const phoneRequests = rateLimitCache.get(phoneKey) || [];

		for (const window of windows) {
			const recentRequests = phoneRequests.filter(
				(timestamp) => now - timestamp < window.duration,
			);

			if (recentRequests.length >= window.max) {
				const oldestRequest = Math.min(...recentRequests);
				const retryAfter = Math.ceil(
					(oldestRequest + window.duration - now) / 1000,
				);

				// Log rate limit violation to system_logs
				logger.warn("Rate limit violation - phone number", {
					metadata: {
						phoneNumber: maskPhoneNumber(phoneNumber),
						window: `${window.duration}ms`,
						max: window.max,
						current: recentRequests.length,
						retryAfter,
						status: "rate-limit-exceeded",
					},
					tags: ["phone-auth", "rate-limit"],
					ip: ipAddress,
				});

				// Get translation for error message
				const { t } = await getT(locale || "tw");
				const message = t("otp_rate_limit_exceeded", {
					retryAfter,
					defaultValue: `Too many requests. Please try again in ${retryAfter} seconds.`,
				});

				return {
					allowed: false,
					message,
					retryAfter,
				};
			}
		}

		// Add current request
		phoneRequests.push(now);
		rateLimitCache.set(phoneKey, phoneRequests);

		// Clean up old entries
		cleanupCache(phoneKey, phoneRequests);
	}

	// Check IP address rate limit
	if (ipAddress) {
		const ipKey = `ip:${ipAddress}`;
		const ipRequests = rateLimitCache.get(ipKey) || [];
		const ipWindows = [
			{ duration: 15 * 60 * 1000, max: 10 },
			{ duration: 60 * 60 * 1000, max: 20 },
			{ duration: 24 * 60 * 60 * 1000, max: 50 },
		];

		for (const window of ipWindows) {
			const recentRequests = ipRequests.filter(
				(timestamp) => now - timestamp < window.duration,
			);

			if (recentRequests.length >= window.max) {
				const oldestRequest = Math.min(...recentRequests);
				const retryAfter = Math.ceil(
					(oldestRequest + window.duration - now) / 1000,
				);

				// Log rate limit violation to system_logs
				logger.warn("Rate limit violation - IP address", {
					metadata: {
						ipAddress,
						window: `${window.duration}ms`,
						max: window.max,
						current: recentRequests.length,
						retryAfter,
						status: "rate-limit-exceeded",
					},
					tags: ["phone-auth", "rate-limit"],
					ip: ipAddress,
				});

				// Get translation for error message
				const { t } = await getT(locale || "tw");
				const message = t("otp_rate_limit_exceeded", {
					retryAfter,
					defaultValue: `Too many requests. Please try again in ${retryAfter} seconds.`,
				});

				return {
					allowed: false,
					message,
					retryAfter,
				};
			}
		}

		// Add current request
		ipRequests.push(now);
		rateLimitCache.set(ipKey, ipRequests);

		// Clean up old entries
		cleanupCache(ipKey, ipRequests);
	}

	return { allowed: true };
}

function cleanupCache(key: string, requests: number[]): void {
	const now = Date.now();
	const maxAge = 24 * 60 * 60 * 1000; // 24 hours
	const filtered = requests.filter((timestamp) => now - timestamp < maxAge);

	if (filtered.length === 0) {
		rateLimitCache.delete(key);
	} else {
		rateLimitCache.set(key, filtered);
	}
}
