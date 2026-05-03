const LEGACY_PERCENT_PATTERN = /%([A-Za-z0-9_.]+)%/g;

export function convertLegacyPercentSyntaxToMustache(template: string): string {
	if (!template.includes("%")) {
		return template;
	}

	return template.replace(LEGACY_PERCENT_PATTERN, (_match, token: string) => {
		return `{{${toCamelCasePath(token)}}}`;
	});
}

function toCamelCasePath(tokenPath: string): string {
	return tokenPath
		.split(".")
		.map((segment) =>
			segment
				.split("_")
				.map((chunk, index) => {
					if (index === 0)
						return chunk.charAt(0).toLowerCase() + chunk.slice(1);
					return chunk.charAt(0).toUpperCase() + chunk.slice(1);
				})
				.join(""),
		)
		.join(".");
}

/** Mustache tokens for auth URL injection (senders replace after `PhaseTags`). */
export const authEmailUrlMustachePlaceholders = {
	magicLinkURL: convertLegacyPercentSyntaxToMustache("%Customer.MagicLinkURL%"),
	passwordRecoveryURL: convertLegacyPercentSyntaxToMustache(
		"%Customer.PasswordRecoveryURL%",
	),
	accountActivationURL: convertLegacyPercentSyntaxToMustache(
		"%Customer.AccountActivationURL%",
	),
} as const;

/** Replace a literal mustache token (e.g. `{{customer.magicLinkURL}}`) case-insensitively. */
export function replaceMustacheToken(
	template: string,
	token: string,
	value: string,
): string {
	if (!token) return template;
	const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return template.replace(new RegExp(escaped, "gi"), value);
}
