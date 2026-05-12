"use client";

import { useCallback, useMemo, useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { IconCopy, IconCheck } from "@tabler/icons-react";
import { toastSuccess } from "@/components/toaster";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { parseLifecycleTemplateKey } from "@/lib/notification/template-registry";

export interface TemplateVariable {
	name: string;
	description: string;
	example: string;
	category:
		| "user"
		| "store"
		| "order"
		| "reservation"
		| "credit"
		| "payment"
		| "system"
		| "marketing"
		| "locale";
}

export interface TemplateVariablePreviewProps {
	/** Lifecycle template name, e.g. `order.credit_topup_completed.customer.email`. Used to pick payload variables. */
	messageTemplateName?: string | null;
	onVariableSelect?: (variable: string) => void;
	className?: string;
}

function buildLifecycleVariables(
	domain: "order" | "reservation" | "subscription",
): TemplateVariable[] {
	if (domain === "order") {
		return [
			{
				name: "customer.id",
				description: "Customer user id",
				example: "clxxxxxxxx",
				category: "user",
			},
			{
				name: "customer.name",
				description: "Customer display name",
				example: "Jane Doe",
				category: "user",
			},
			{
				name: "customer.email",
				description: "Customer email",
				example: "jane@example.com",
				category: "user",
			},
			{
				name: "store.id",
				description: "Store id",
				example: "store_xxx",
				category: "store",
			},
			{
				name: "store.name",
				description: "Store display name",
				example: "My Shop",
				category: "store",
			},
			{
				name: "order.id",
				description: "Order id",
				example: "ord_xxx",
				category: "order",
			},
			{
				name: "order.orderNumber",
				description: "Order number (same as id in current payload)",
				example: "ord_xxx",
				category: "order",
			},
			{
				name: "order.createdOn",
				description: "Order creation (formatted)",
				example: "2026-05-01 14:30",
				category: "order",
			},
			{
				name: "order.total",
				description: "Order total",
				example: "1200",
				category: "order",
			},
			{
				name: "order.itemsSummary",
				description: "Order line items (name, quantity, unit price, options)",
				example: "Product A ×2 @ $100\n  • Option 1",
				category: "order",
			},
			{
				name: "support.email",
				description:
					"Platform support email (merged on some order emails, e.g. credit top-up)",
				example: "support@example.com",
				category: "system",
			},
			{
				name: "app.name",
				description: "App display name from platform settings (PhaseTags)",
				example: "riben.life",
				category: "system",
			},
		];
	}

	if (domain === "reservation") {
		return [
			{
				name: "locale",
				description: "Notification locale code",
				example: "en",
				category: "locale",
			},
			{
				name: "customer.id",
				description: "Customer id",
				example: "clxxxxxxxx",
				category: "user",
			},
			{
				name: "customer.name",
				description: "Customer name",
				example: "Jane Doe",
				category: "user",
			},
			{
				name: "customer.email",
				description: "Customer email",
				example: "jane@example.com",
				category: "user",
			},
			{
				name: "customer.phone",
				description: "Customer phone",
				example: "+886912345678",
				category: "user",
			},
			{
				name: "store.id",
				description: "Store id",
				example: "store_xxx",
				category: "store",
			},
			{
				name: "store.name",
				description: "Store name",
				example: "My Shop",
				category: "store",
			},
			{
				name: "order.orderNumber",
				description: "Linked order number",
				example: "42",
				category: "order",
			},
			{
				name: "order.createdOn",
				description: "Linked order creation (formatted)",
				example: "2026-05-01 14:30",
				category: "order",
			},
			{
				name: "order.updatedAt",
				description: "Linked order last update (formatted)",
				example: "2026-05-01 15:00",
				category: "order",
			},
			{
				name: "order.total",
				description: "Linked order total",
				example: "500 TWD",
				category: "order",
			},
			{
				name: "reservation.id",
				description: "Reservation / RSVP id",
				example: "rsvp_xxx",
				category: "reservation",
			},
			{
				name: "reservation.status",
				description: "Current reservation status",
				example: "confirmed",
				category: "reservation",
			},
			{
				name: "reservation.previousStatus",
				description: "Previous status (when applicable)",
				example: "pending",
				category: "reservation",
			},
			{
				name: "reservation.dateTime",
				description: "Reservation date/time (formatted)",
				example: "2026-05-01 14:00",
				category: "reservation",
			},
			{
				name: "reservation.arriveTime",
				description: "Arrival time (formatted)",
				example: "2026-05-01 14:30",
				category: "reservation",
			},
			{
				name: "reservation.facilityName",
				description: "Facility name",
				example: "Meeting Room A",
				category: "reservation",
			},
			{
				name: "reservation.serviceStaffName",
				description: "Assigned staff name",
				example: "Alex",
				category: "reservation",
			},
			{
				name: "reservation.numOfAdult",
				description: "Number of adults",
				example: "2",
				category: "reservation",
			},
			{
				name: "reservation.numOfChild",
				description: "Number of children",
				example: "0",
				category: "reservation",
			},
			{
				name: "reservation.message",
				description: "Customer note",
				example: "Window seat please",
				category: "reservation",
			},
			{
				name: "reservation.checkInCode",
				description: "Check-in code",
				example: "ABC123",
				category: "reservation",
			},
			{
				name: "reservation.actionUrl",
				description: "Action / manage URL",
				example: "https://…",
				category: "reservation",
			},
			{
				name: "reservation.orderId",
				description: "Linked order id (if any)",
				example: "ord_xxx",
				category: "reservation",
			},
			{
				name: "reservation.paymentAmount",
				description: "Payment amount",
				example: "500",
				category: "reservation",
			},
			{
				name: "reservation.paymentCurrency",
				description: "Payment currency",
				example: "TWD",
				category: "reservation",
			},
			{
				name: "reservation.refundAmount",
				description: "Refund amount",
				example: "100",
				category: "reservation",
			},
			{
				name: "reservation.refundCurrency",
				description: "Refund currency",
				example: "TWD",
				category: "reservation",
			},
		];
	}

	// subscription
	return [
		{
			name: "customer.id",
			description: "Customer user id",
			example: "clxxxxxxxx",
			category: "user",
		},
		{
			name: "customer.name",
			description: "Customer name",
			example: "Jane Doe",
			category: "user",
		},
		{
			name: "customer.email",
			description: "Customer email",
			example: "jane@example.com",
			category: "user",
		},
		{
			name: "support.email",
			description: "Platform support email",
			example: "support@example.com",
			category: "system",
		},
	];
}

/** Variables shown when template name is not a lifecycle key (sender-dependent). */
const nonLifecycleFallback: TemplateVariable[] = [
	{
		name: "customer.name",
		description: "Often available when templates target a logged-in customer",
		example: "Jane Doe",
		category: "user",
	},
	{
		name: "customer.email",
		description: "Often available when templates target a logged-in customer",
		example: "jane@example.com",
		category: "user",
	},
	{
		name: "customer.username",
		description: "Same as customer email in PhaseTags auth flows",
		example: "jane@example.com",
		category: "user",
	},
	{
		name: "customer.customerId",
		description: "Customer user id (PhaseTags)",
		example: "clxxxxxxxx",
		category: "user",
	},
	{
		name: "customer.magicLinkURL",
		description: "Injected when sending magic link email",
		example: "https://…",
		category: "user",
	},
	{
		name: "customer.passwordRecoveryURL",
		description: "Injected when sending password recovery email",
		example: "https://…",
		category: "user",
	},
	{
		name: "customer.accountActivationURL",
		description: "Injected when sending email validation",
		example: "https://…",
		category: "user",
	},
	{
		name: "customer.newPassword",
		description:
			"Populated by sender on password-reset confirmation when applicable",
		example: "(when provided)",
		category: "user",
	},
	{
		name: "store.id",
		description: "Store id (PhaseTags)",
		example: "store_xxx",
		category: "store",
	},
	{
		name: "store.name",
		description: "Often available for store-scoped notifications",
		example: "My Shop",
		category: "store",
	},
	{
		name: "order.orderId",
		description: "Order id (PhaseTags)",
		example: "ord_xxx",
		category: "order",
	},
	{
		name: "order.orderNumber",
		description: "Same as order id in PhaseTags today",
		example: "ord_xxx",
		category: "order",
	},
	{
		name: "order.createdOn",
		description: "Formatted creation time (PhaseTags)",
		example: "2026-05-01 14:30",
		category: "order",
	},
	{
		name: "order.customerFullName",
		description: "Customer name on order (PhaseTags)",
		example: "Jane Doe",
		category: "order",
	},
	{
		name: "support.email",
		description: "Platform support email when merged by sender",
		example: "support@example.com",
		category: "system",
	},
	{
		name: "app.name",
		description: "App display name from platform settings (PhaseTags)",
		example: "riben.life",
		category: "system",
	},
];

const categoryColors: Record<TemplateVariable["category"], string> = {
	user: "bg-blue-500",
	store: "bg-green-500",
	order: "bg-purple-500",
	reservation: "bg-orange-500",
	credit: "bg-yellow-500",
	payment: "bg-pink-500",
	system: "bg-gray-500",
	marketing: "bg-indigo-500",
	locale: "bg-cyan-600",
};

export function TemplateVariablePreview({
	messageTemplateName,
	onVariableSelect,
	className,
}: TemplateVariablePreviewProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

	const descriptor = useMemo(() => {
		const name = messageTemplateName?.trim();
		if (!name) return null;
		return parseLifecycleTemplateKey(name);
	}, [messageTemplateName]);

	const typeVariables = useMemo(() => {
		if (descriptor?.domain) {
			return buildLifecycleVariables(descriptor.domain);
		}
		return nonLifecycleFallback;
	}, [descriptor]);

	const groupedVariables = useMemo(() => {
		return typeVariables.reduce(
			(acc, variable) => {
				const cat = variable.category;
				const bucket = acc[cat];
				if (bucket) {
					bucket.push(variable);
				} else {
					acc[cat] = [variable];
				}
				return acc;
			},
			{} as Partial<Record<TemplateVariable["category"], TemplateVariable[]>>,
		);
	}, [typeVariables]);

	const categoryLabel = useCallback(
		(cat: TemplateVariable["category"]) => {
			const map: Record<TemplateVariable["category"], string> = {
				user: t("mail_template_variables_category_customer"),
				store: t("mail_template_variables_category_store"),
				order: t("mail_template_variables_category_order"),
				reservation: t("mail_template_variables_category_reservation"),
				credit: t("mail_template_variables_category_credit"),
				payment: t("mail_template_variables_category_payment"),
				system: t("mail_template_variables_category_platform"),
				marketing: t("mail_template_variables_category_marketing"),
				locale: t("mail_template_variables_category_locale"),
			};
			return map[cat];
		},
		[t],
	);

	const copyToClipboard = useCallback(
		(variable: TemplateVariable) => {
			const variableSyntax = `{{${variable.name}}}`;
			navigator.clipboard.writeText(variableSyntax);
			setCopiedVariable(variable.name);
			toastSuccess({
				description: t("variable_copied_to_clipboard", {
					variable: variableSyntax,
				}),
			});
			setTimeout(() => setCopiedVariable(null), 2000);
		},
		[t],
	);

	const handleVariableClick = useCallback(
		(variable: TemplateVariable) => {
			const variableSyntax = `{{${variable.name}}}`;
			if (onVariableSelect) {
				onVariableSelect(variableSyntax);
			} else {
				copyToClipboard(variable);
			}
		},
		[onVariableSelect, copyToClipboard],
	);

	const renderVariableList = (variables: TemplateVariable[]) =>
		variables.map((variable) => {
			const variableSyntax = `{{${variable.name}}}`;
			const isCopied = copiedVariable === variable.name;

			return (
				<div
					key={variable.name}
					className="flex items-start justify-between gap-2 p-2 rounded-md hover:bg-accent transition-colors cursor-pointer"
					onClick={() => handleVariableClick(variable)}
				>
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-1">
							<code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
								{variableSyntax}
							</code>
						</div>
						<p className="text-xs text-muted-foreground mb-1">
							{variable.description}
						</p>
						<p className="text-xs text-muted-foreground italic">
							{t("mail_template_variables_example_label")}: {variable.example}
						</p>
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="h-6 w-6 shrink-0"
						onClick={(e) => {
							e.stopPropagation();
							copyToClipboard(variable);
						}}
					>
						{isCopied ? (
							<IconCheck className="h-3 w-3 text-green-500" />
						) : (
							<IconCopy className="h-3 w-3" />
						)}
					</Button>
				</div>
			);
		});

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle className="text-sm">{t("available_variables")}</CardTitle>
				<CardDescription className="text-xs space-y-1">
					<p>{t("available_variables_description")}</p>
					{!descriptor && (
						<p className="text-amber-700 dark:text-amber-500">
							{t("mail_template_variables_non_lifecycle_hint")}
						</p>
					)}
				</CardDescription>
			</CardHeader>
			<CardContent className="p-0">
				<ScrollArea className="h-[400px]">
					<div className="p-4 space-y-4">
						{Object.entries(groupedVariables).map(([category, variables]) => {
							if (!variables?.length) return null;
							return (
								<div key={category}>
									<div className="flex items-center gap-2 mb-2">
										<Badge
											variant="secondary"
											className={`${categoryColors[category as TemplateVariable["category"]]} text-white text-xs`}
										>
											{categoryLabel(category as TemplateVariable["category"])}
										</Badge>
									</div>
									<div className="space-y-2 ml-2">
										{renderVariableList(variables)}
									</div>
									<Separator className="mt-4" />
								</div>
							);
						})}
					</div>
				</ScrollArea>
			</CardContent>
		</Card>
	);
}
