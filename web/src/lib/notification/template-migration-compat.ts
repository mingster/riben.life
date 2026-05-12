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

/** Mustache tokens for auth-only fields applied after `PhaseTags`. */
export const authEmailMustachePlaceholders = {
	...authEmailUrlMustachePlaceholders,
	newPassword: convertLegacyPercentSyntaxToMustache("%Customer.NewPassword%"),
} as const;

export interface AuthEmailMustacheValues {
	magicLinkURL?: string;
	passwordRecoveryURL?: string;
	accountActivationURL?: string;
	newPassword?: string;
}

/** Replace auth-specific mustache tokens (URLs, admin-set password) after `PhaseTags`. */
export function applyAuthEmailMustacheValues(
	template: string,
	values: AuthEmailMustacheValues,
): string {
	let result = template;

	if (values.magicLinkURL !== undefined) {
		result = replaceMustacheToken(
			result,
			authEmailMustachePlaceholders.magicLinkURL,
			values.magicLinkURL,
		);
	}
	if (values.passwordRecoveryURL !== undefined) {
		result = replaceMustacheToken(
			result,
			authEmailMustachePlaceholders.passwordRecoveryURL,
			values.passwordRecoveryURL,
		);
	}
	if (values.accountActivationURL !== undefined) {
		result = replaceMustacheToken(
			result,
			authEmailMustachePlaceholders.accountActivationURL,
			values.accountActivationURL,
		);
	}
	if (values.newPassword !== undefined) {
		result = replaceMustacheToken(
			result,
			authEmailMustachePlaceholders.newPassword,
			values.newPassword,
		);
	}

	return result;
}

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
