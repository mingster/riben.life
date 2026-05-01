/**
 * Template Engine
 * Processes notification templates with variable substitution and localization
 */

import { sqlClient } from "@/lib/prismadb";
import { convertLegacyPercentSyntaxToMustache } from "./template-migration-compat";
import { buildLocaleFallbackCandidates } from "./locale-fallback";
import type {
	NotificationChannel,
	NotificationContext,
	RenderedTemplate,
} from "./types";

interface TemplateRenderOptions {
	storeId?: string | null;
	channel?: NotificationChannel;
}

interface LocalizedTemplateRow {
	localeId: string;
	isActive: boolean;
	subject: string;
	body: string;
}

export class TemplateEngine {
	async render(
		templateId: string,
		userIdOrLocale: string,
		variables: Record<string, unknown> = {},
		options: TemplateRenderOptions = {},
	): Promise<RenderedTemplate> {
		const localeCandidates = await this.resolveLocaleCandidates(
			userIdOrLocale,
			options.storeId ?? null,
		);
		const template = await sqlClient.messageTemplate.findUnique({
			where: { id: templateId },
			include: { MessageTemplateLocalized: true },
		});
		if (!template) {
			throw new Error(`Template not found: ${templateId}`);
		}

		const localized = this.pickLocalizedTemplate(
			template.MessageTemplateLocalized as LocalizedTemplateRow[],
			localeCandidates,
		);
		if (!localized) {
			throw new Error(
				`Localized template not found for locale candidates: ${localeCandidates.join(", ")}`,
			);
		}

		const subjectTemplate = convertLegacyPercentSyntaxToMustache(
			localized.subject ?? "",
		);
		const bodyTemplate = convertLegacyPercentSyntaxToMustache(
			localized.body ?? "",
		);
		const subject = this.substituteVariables(subjectTemplate, variables);
		const body = this.substituteVariables(bodyTemplate, variables);
		const unresolvedTokens = [
			...this.findUnresolvedTokens(subject),
			...this.findUnresolvedTokens(body),
		].filter((value, index, list) => list.indexOf(value) === index);

		return {
			subject: options.channel === "email" || subject.length > 0 ? subject : "",
			body,
			textBody: this.stripHtml(body),
			localeUsed: localized.localeId,
			unresolvedTokens,
		};
	}

	async renderContent(
		template: string,
		variables: Record<string, unknown> = {},
	): Promise<{ rendered: string; unresolvedTokens: string[] }> {
		const normalizedTemplate = convertLegacyPercentSyntaxToMustache(template);
		const rendered = this.substituteVariables(normalizedTemplate, variables);
		return {
			rendered,
			unresolvedTokens: this.findUnresolvedTokens(rendered),
		};
	}

	private async resolveLocaleCandidates(
		userIdOrLocale: string,
		storeId: string | null,
	): Promise<string[]> {
		const looksLikeLocale =
			userIdOrLocale.length <= 5 || userIdOrLocale.includes("-");
		let requestedLocale: string | null = null;
		if (!looksLikeLocale) {
			const user = await sqlClient.user.findUnique({
				where: { id: userIdOrLocale },
				select: { locale: true },
			});
			requestedLocale = this.normalizeLocale(
				user?.locale as string | null | undefined,
			);
		} else {
			requestedLocale = this.normalizeLocale(userIdOrLocale);
		}

		let storeDefaultLocale: string | null = null;
		if (storeId) {
			const store = await sqlClient.store.findUnique({
				where: { id: storeId },
				select: { defaultLocale: true },
			});
			storeDefaultLocale = this.normalizeLocale(store?.defaultLocale);
		}

		const availableLocales = await sqlClient.locale.findMany({
			select: { id: true, lng: true },
		});
		return buildLocaleFallbackCandidates({
			requestedLocale,
			storeDefaultLocale,
			systemDefaultLocale: "en-US",
			availableLocales,
		}).filter(
			(value, index, list) => Boolean(value) && list.indexOf(value) === index,
		);
	}

	private pickLocalizedTemplate(
		rows: LocalizedTemplateRow[],
		localeCandidates: string[],
	): LocalizedTemplateRow | null {
		for (const locale of localeCandidates) {
			const row = rows.find(
				(item) =>
					item.isActive &&
					this.normalizeLocale(item.localeId) === this.normalizeLocale(locale),
			);
			if (row) {
				return row;
			}
		}
		return null;
	}

	private normalizeLocale(locale: string | null | undefined): string | null {
		if (!locale) return null;
		const value = locale.trim().toLowerCase();
		if (value === "tw" || value === "zh-tw") return "zh-TW";
		if (value === "jp" || value === "ja-jp") return "ja-JP";
		if (value === "en" || value === "en-us") return "en-US";
		return locale;
	}

	private substituteVariables(
		template: string,
		variables: Record<string, unknown>,
	): string {
		return template.replace(
			/\{\{(\w+(?:\.\w+)*)\}\}/g,
			(match, path: string) => {
				const value = this.getNestedValue(variables, path);
				return value !== undefined && value !== null ? String(value) : match;
			},
		);
	}

	private findUnresolvedTokens(template: string): string[] {
		const matches = template.match(/\{\{(\w+(?:\.\w+)*)\}\}/g) ?? [];
		return matches.map((item) => item.slice(2, -2));
	}

	private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
		return path.split(".").reduce<unknown>((current, prop) => {
			if (typeof current !== "object" || current === null) {
				return undefined;
			}
			const map = current as Record<string, unknown>;
			return map[prop];
		}, obj);
	}

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

	validateTemplate(template: string): { valid: boolean; errors?: string[] } {
		const errors: string[] = [];
		const openBraces = (template.match(/\{\{/g) || []).length;
		const closeBraces = (template.match(/\}\}/g) || []).length;
		if (openBraces !== closeBraces) {
			errors.push("Unclosed variable braces detected");
		}
		const matches = template.match(/\{\{[^}]+\}\}/g);
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

	getAvailableVariables(context: NotificationContext): string[] {
		const variables: string[] = [];
		if (context.user) variables.push("user.id", "user.name", "user.email");
		if (context.store) variables.push("store.id", "store.name");
		if (context.order) variables.push("order.id", "order.total");
		if (context.reservation)
			variables.push("reservation.id", "reservation.date");
		Object.keys(context).forEach((key) => {
			if (!["user", "store", "order", "reservation"].includes(key)) {
				variables.push(key);
			}
		});
		return variables;
	}
}
