/**
 * Public base URL for OAuth redirects and customer calendar links.
 */
export function getAppBaseUrl(): string {
	return (
		process.env.NEXT_PUBLIC_BASE_URL ||
		process.env.NEXT_PUBLIC_API_URL ||
		(process.env.NODE_ENV === "production"
			? "https://riben.life"
			: "http://localhost:3001")
	);
}

export function getGoogleCalendarRedirectUri(): string {
	return `${getAppBaseUrl()}/api/auth/google-calendar`;
}
