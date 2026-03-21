/**
 * Resolves organization id from better-auth `createOrganization` API response
 * (response shape can vary by plugin version).
 */
export function getOrganizationIdFromCreateResponse(
	result: unknown,
): string | null {
	if (!result || typeof result !== "object") {
		return null;
	}
	const r = result as Record<string, unknown>;
	if (typeof r.id === "string") {
		return r.id;
	}
	const org = r.organization;
	if (
		org &&
		typeof org === "object" &&
		typeof (org as { id?: unknown }).id === "string"
	) {
		return (org as { id: string }).id;
	}
	return null;
}
