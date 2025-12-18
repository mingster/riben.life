"use client";

import { useState, useCallback } from "react";
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
		| "marketing";
}

export interface TemplateVariablePreviewProps {
	notificationType?: string | null;
	onVariableSelect?: (variable: string) => void;
	className?: string;
}

// Available variables by notification type
const variableCategories: Record<string, TemplateVariable[]> = {
	order: [
		{
			name: "order.id",
			description: "Order ID",
			example: "ORD-12345",
			category: "order",
		},
		{
			name: "order.total",
			description: "Order total amount",
			example: "$99.99",
			category: "order",
		},
		{
			name: "order.status",
			description: "Order status",
			example: "Confirmed",
			category: "order",
		},
		{
			name: "order.createdAt",
			description: "Order creation date",
			example: "2024-01-15 14:30",
			category: "order",
		},
		{
			name: "user.name",
			description: "Customer name",
			example: "John Doe",
			category: "user",
		},
		{
			name: "user.email",
			description: "Customer email",
			example: "john@example.com",
			category: "user",
		},
		{
			name: "store.name",
			description: "Store name",
			example: "My Store",
			category: "store",
		},
	],
	reservation: [
		{
			name: "reservation.id",
			description: "Reservation ID",
			example: "RES-12345",
			category: "reservation",
		},
		{
			name: "reservation.facilityName",
			description: "Facility name",
			example: "Meeting Room A",
			category: "reservation",
		},
		{
			name: "reservation.startTime",
			description: "Reservation start time",
			example: "2024-01-15 14:00",
			category: "reservation",
		},
		{
			name: "reservation.endTime",
			description: "Reservation end time",
			example: "2024-01-15 16:00",
			category: "reservation",
		},
		{
			name: "user.name",
			description: "Customer name",
			example: "John Doe",
			category: "user",
		},
		{
			name: "user.email",
			description: "Customer email",
			example: "john@example.com",
			category: "user",
		},
		{
			name: "store.name",
			description: "Store name",
			example: "My Store",
			category: "store",
		},
	],
	credit: [
		{
			name: "credit.amount",
			description: "Credit amount",
			example: "100 points",
			category: "credit",
		},
		{
			name: "credit.balance",
			description: "Current credit balance",
			example: "500 points",
			category: "credit",
		},
		{
			name: "credit.transactionType",
			description: "Transaction type",
			example: "Purchase",
			category: "credit",
		},
		{
			name: "user.name",
			description: "Customer name",
			example: "John Doe",
			category: "user",
		},
		{
			name: "user.email",
			description: "Customer email",
			example: "john@example.com",
			category: "user",
		},
		{
			name: "store.name",
			description: "Store name",
			example: "My Store",
			category: "store",
		},
	],
	payment: [
		{
			name: "payment.id",
			description: "Payment ID",
			example: "PAY-12345",
			category: "payment",
		},
		{
			name: "payment.amount",
			description: "Payment amount",
			example: "$99.99",
			category: "payment",
		},
		{
			name: "payment.method",
			description: "Payment method",
			example: "Credit Card",
			category: "payment",
		},
		{
			name: "payment.status",
			description: "Payment status",
			example: "Completed",
			category: "payment",
		},
		{
			name: "user.name",
			description: "Customer name",
			example: "John Doe",
			category: "user",
		},
		{
			name: "user.email",
			description: "Customer email",
			example: "john@example.com",
			category: "user",
		},
		{
			name: "store.name",
			description: "Store name",
			example: "My Store",
			category: "store",
		},
	],
	system: [
		{
			name: "system.message",
			description: "System message",
			example: "System maintenance scheduled",
			category: "system",
		},
		{
			name: "user.name",
			description: "User name",
			example: "John Doe",
			category: "user",
		},
		{
			name: "user.email",
			description: "User email",
			example: "john@example.com",
			category: "user",
		},
	],
	marketing: [
		{
			name: "marketing.campaign",
			description: "Marketing campaign name",
			example: "Summer Sale 2024",
			category: "marketing",
		},
		{
			name: "marketing.offer",
			description: "Special offer",
			example: "20% off",
			category: "marketing",
		},
		{
			name: "user.name",
			description: "Customer name",
			example: "John Doe",
			category: "user",
		},
		{
			name: "user.email",
			description: "Customer email",
			example: "john@example.com",
			category: "user",
		},
		{
			name: "store.name",
			description: "Store name",
			example: "My Store",
			category: "store",
		},
	],
};

// Common variables available for all types
const commonVariables: TemplateVariable[] = [
	{
		name: "user.name",
		description: "User/Customer name",
		example: "John Doe",
		category: "user",
	},
	{
		name: "user.email",
		description: "User/Customer email",
		example: "john@example.com",
		category: "user",
	},
	{
		name: "store.name",
		description: "Store name",
		example: "My Store",
		category: "store",
	},
	{
		name: "store.phone",
		description: "Store phone number",
		example: "+1-234-567-8900",
		category: "store",
	},
	{
		name: "store.address",
		description: "Store address",
		example: "123 Main St, City, State",
		category: "store",
	},
];

const categoryLabels: Record<TemplateVariable["category"], string> = {
	user: "User",
	store: "Store",
	order: "Order",
	reservation: "Reservation",
	credit: "Credit",
	payment: "Payment",
	system: "System",
	marketing: "Marketing",
};

const categoryColors: Record<TemplateVariable["category"], string> = {
	user: "bg-blue-500",
	store: "bg-green-500",
	order: "bg-purple-500",
	reservation: "bg-orange-500",
	credit: "bg-yellow-500",
	payment: "bg-pink-500",
	system: "bg-gray-500",
	marketing: "bg-indigo-500",
};

export function TemplateVariablePreview({
	notificationType,
	onVariableSelect,
	className,
}: TemplateVariablePreviewProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

	// Get variables for the notification type, or use common variables
	const typeVariables =
		notificationType && variableCategories[notificationType]
			? variableCategories[notificationType]
			: commonVariables;

	// Group variables by category
	const groupedVariables = typeVariables.reduce(
		(acc, variable) => {
			if (!acc[variable.category]) {
				acc[variable.category] = [];
			}
			acc[variable.category].push(variable);
			return acc;
		},
		{} as Record<TemplateVariable["category"], TemplateVariable[]>,
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

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle className="text-sm">{t("available_variables")}</CardTitle>
				<CardDescription className="text-xs">
					{t("available_variables_description")}
				</CardDescription>
			</CardHeader>
			<CardContent className="p-0">
				<ScrollArea className="h-[400px]">
					<div className="p-4 space-y-4">
						{Object.entries(groupedVariables).map(([category, variables]) => (
							<div key={category}>
								<div className="flex items-center gap-2 mb-2">
									<Badge
										variant="secondary"
										className={`${categoryColors[category as TemplateVariable["category"]]} text-white text-xs`}
									>
										{categoryLabels[category as TemplateVariable["category"]]}
									</Badge>
								</div>
								<div className="space-y-2 ml-2">
									{variables.map((variable) => {
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
														Example: {variable.example}
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
									})}
								</div>
								<Separator className="mt-4" />
							</div>
						))}
					</div>
				</ScrollArea>
			</CardContent>
		</Card>
	);
}
