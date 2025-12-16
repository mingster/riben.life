/**
 * Template Engine
 * Processes notification templates with variable substitution and localization
 */

import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import type { RenderedTemplate, NotificationContext } from "./types";

export class TemplateEngine {
	/**
	 * Render a template with variables
	 */
	async render(
		templateId: string,
		userIdOrLocale: string,
		variables: Record<string, any> = {},
	): Promise<RenderedTemplate> {
		// Get user locale if userId is provided
		let locale = userIdOrLocale;
		if (userIdOrLocale.length > 2) {
			// Likely a user ID, get their locale from user's locale field
			const user = await sqlClient.user.findUnique({
				where: { id: userIdOrLocale },
				select: { locale: true },
			});
			locale = (user?.locale as string) || "tw"; // Default to "tw" per project convention
		}

		// Get template
		const template = await sqlClient.messageTemplate.findUnique({
			where: { id: templateId },
			include: {
				MessageTemplateLocalized: {
					where: {
						localeId: locale,
						isActive: true,
					},
				},
			},
		});

		if (!template) {
			throw new Error(`Template not found: ${templateId}`);
		}

		// Get localized version
		const localized = template.MessageTemplateLocalized[0];
		if (!localized) {
			throw new Error(`Localized template not found for locale: ${locale}`);
		}

		// Substitute variables
		const subject = this.substituteVariables(localized.subject, variables);
		const body = this.substituteVariables(localized.body, variables);

		return {
			subject,
			body,
			textBody: this.stripHtml(body), // For email text version
		};
	}

	/**
	 * Substitute variables in template string
	 */
	private substituteVariables(
		template: string,
		variables: Record<string, any>,
	): string {
		let result = template;

		// Replace {{variable}} patterns
		const variablePattern = /\{\{(\w+(?:\.\w+)*)\}\}/g;
		result = result.replace(variablePattern, (match, path) => {
			const value = this.getNestedValue(variables, path);
			return value !== undefined && value !== null ? String(value) : match;
		});

		return result;
	}

	/**
	 * Get nested value from object using dot notation
	 */
	private getNestedValue(obj: any, path: string): any {
		return path.split(".").reduce((current, prop) => {
			return current && current[prop] !== undefined ? current[prop] : undefined;
		}, obj);
	}

	/**
	 * Strip HTML tags for text version
	 */
	private stripHtml(html: string): string {
		return html
			.replace(/<[^>]*>/g, "")
			.replace(/&nbsp;/g, " ")
			.replace(/&amp;/g, "&")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.trim();
	}

	/**
	 * Validate template syntax
	 */
	validateTemplate(template: string): {
		valid: boolean;
		errors?: string[];
	} {
		const errors: string[] = [];

		// Check for unclosed variable braces
		const openBraces = (template.match(/\{\{/g) || []).length;
		const closeBraces = (template.match(/\}\}/g) || []).length;
		if (openBraces !== closeBraces) {
			errors.push("Unclosed variable braces detected");
		}

		// Check for invalid variable syntax
		const invalidPattern = /\{\{[^}]+\}\}/g;
		const matches = template.match(invalidPattern);
		if (matches) {
			for (const match of matches) {
				if (!/^\{\{\w+(?:\.\w+)*\}\}$/.test(match)) {
					errors.push(`Invalid variable syntax: ${match}`);
				}
			}
		}

		return {
			valid: errors.length === 0,
			errors: errors.length > 0 ? errors : undefined,
		};
	}

	/**
	 * Get available variables for a notification context
	 */
	getAvailableVariables(context: NotificationContext): string[] {
		const variables: string[] = [];

		if (context.user) {
			variables.push("user.id", "user.name", "user.email");
		}

		if (context.store) {
			variables.push("store.id", "store.name");
		}

		if (context.order) {
			variables.push("order.id", "order.total");
		}

		if (context.reservation) {
			variables.push("reservation.id", "reservation.date");
		}

		// Add custom variables
		Object.keys(context).forEach((key) => {
			if (!["user", "store", "order", "reservation"].includes(key)) {
				variables.push(key);
			}
		});

		return variables;
	}
}
