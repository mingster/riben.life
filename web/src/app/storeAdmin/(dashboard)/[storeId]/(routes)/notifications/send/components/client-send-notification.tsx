"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Heading } from "@/components/heading";
import { Separator } from "@/components/ui/separator";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { sendStoreNotificationAction } from "@/actions/storeAdmin/notification/send-store-notification";
import {
	sendStoreNotificationSchema,
	type SendStoreNotificationInput,
} from "@/actions/storeAdmin/notification/send-store-notification.validation";
import { toastError, toastSuccess } from "@/components/toaster";
import { StoreMembersCombobox } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/customers/components/combobox-store-members";
import type { User } from "@/types";
import { IconLoader } from "@tabler/icons-react";
import type {
	SystemNotificationSettings,
	NotificationChannelConfig,
} from "@prisma/client";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

interface ClientSendNotificationProps {
	storeId: string;
	customers: Array<{
		id: string;
		name: string | null;
		email: string | null;
	}>;
	messageTemplates: Array<{
		id: string;
		name: string;
	}>;
	systemSettings: SystemNotificationSettings | null;
	channelConfigs: NotificationChannelConfig[];
}

type FormValues = SendStoreNotificationInput;

const channelLabels: Record<string, string> = {
	onsite: "On-Site",
	email: "Email",
	line: "LINE",
	whatsapp: "WhatsApp",
	wechat: "WeChat",
	sms: "SMS",
	telegram: "Telegram",
	push: "Push",
};

const priorityLabels: Record<string, string> = {
	"0": "Normal",
	"1": "High",
	"2": "Urgent",
};

const notificationTypeLabels: Record<string, string> = {
	order: "Order",
	reservation: "Reservation",
	credit: "Credit",
	payment: "Payment",
	system: "System",
	marketing: "Marketing",
};

const SELECTION_STORAGE_KEY_PREFIX = "send-notification-selection:";

interface StoredSelection {
	recipientType: "single" | "multiple" | "all";
	channels: string[];
	notificationType: string;
	priority: string;
	templateId: string | null;
	recipientIds?: string[];
}

function getStoredSelection(storeId: string): StoredSelection | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(
			`${SELECTION_STORAGE_KEY_PREFIX}${storeId}`,
		);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== "object") return null;
		const o = parsed as Record<string, unknown>;
		if (
			!Array.isArray(o.channels) ||
			o.channels.length === 0 ||
			typeof o.recipientType !== "string" ||
			typeof o.notificationType !== "string" ||
			typeof o.priority !== "string"
		) {
			return null;
		}
		return {
			recipientType:
				o.recipientType === "single" ||
				o.recipientType === "multiple" ||
				o.recipientType === "all"
					? o.recipientType
					: "all",
			channels: o.channels.filter((c): c is string => typeof c === "string"),
			notificationType: String(o.notificationType),
			priority:
				o.priority === "0" || o.priority === "1" || o.priority === "2"
					? o.priority
					: "0",
			templateId:
				o.templateId === null || o.templateId === undefined
					? null
					: String(o.templateId),
			recipientIds: Array.isArray(o.recipientIds)
				? o.recipientIds.filter((id): id is string => typeof id === "string")
				: undefined,
		};
	} catch {
		return null;
	}
}

function saveStoredSelection(storeId: string, data: StoredSelection): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(
			`${SELECTION_STORAGE_KEY_PREFIX}${storeId}`,
			JSON.stringify(data),
		);
	} catch {
		// ignore
	}
}

export function ClientSendNotification({
	storeId,
	customers,
	messageTemplates,
	systemSettings,
	channelConfigs,
}: ClientSendNotificationProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");
	const [selectedCustomers, setSelectedCustomers] = useState<User[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const hasRestoredSelection = useRef(false);

	// Determine which channels are enabled for this store
	const enabledChannels = useMemo(() => {
		const channels: string[] = [];

		// Built-in channels are always enabled
		channels.push("onsite", "email");

		// Check plugin channels
		if (systemSettings) {
			const pluginChannels = [
				{ key: "line", enabled: systemSettings.lineEnabled },
				{ key: "whatsapp", enabled: systemSettings.whatsappEnabled },
				{ key: "wechat", enabled: systemSettings.wechatEnabled },
				{ key: "sms", enabled: systemSettings.smsEnabled },
				{ key: "telegram", enabled: systemSettings.telegramEnabled },
				{ key: "push", enabled: systemSettings.pushEnabled },
			];

			for (const plugin of pluginChannels) {
				if (plugin.enabled) {
					// Check if store has enabled this channel
					const config = channelConfigs.find((c) => c.channel === plugin.key);
					if (config?.enabled) {
						channels.push(plugin.key);
					}
				}
			}
		}

		return channels;
	}, [systemSettings, channelConfigs]);

	const defaultValues = useMemo((): FormValues => {
		const stored = getStoredSelection(storeId);
		if (!stored) {
			return {
				recipientType: "all",
				channels: ["onsite", "email"],
				notificationType: "system",
				subject: "",
				message: "",
				templateId: null,
				priority: "0",
				actionUrl: null,
			};
		}
		const validChannels = stored.channels.filter((c) =>
			enabledChannels.includes(c),
		) as FormValues["channels"];
		const channels: FormValues["channels"] =
			validChannels.length >= 1 ? validChannels : ["onsite", "email"];
		const validNotificationType = Object.keys(notificationTypeLabels).includes(
			stored.notificationType,
		);
		const notificationType: FormValues["notificationType"] =
			validNotificationType
				? (stored.notificationType as FormValues["notificationType"])
				: "system";
		const validPriority =
			stored.priority === "0" ||
			stored.priority === "1" ||
			stored.priority === "2";
		const priority: FormValues["priority"] = validPriority
			? (stored.priority as FormValues["priority"])
			: "0";
		return {
			recipientType: stored.recipientType,
			channels,
			notificationType,
			subject: "",
			message: "",
			templateId: stored.templateId ?? null,
			priority,
			actionUrl: null,
		};
	}, [storeId, enabledChannels]);

	const form = useForm<FormValues>({
		resolver: zodResolver(sendStoreNotificationSchema) as any,
		defaultValues,
	});

	// Restore selected customers from stored selection (once per store when customers are available)
	useEffect(() => {
		if (hasRestoredSelection.current || !customers.length) return;
		const stored = getStoredSelection(storeId);
		if (!stored?.recipientIds?.length) return;
		const users = stored.recipientIds
			.map((id) => customers.find((c) => c.id === id))
			.filter((c): c is User => c != null);
		if (users.length) {
			setSelectedCustomers(users);
			hasRestoredSelection.current = true;
		}
	}, [storeId, customers]);

	// Persist selection when it changes (recipient type, channels, notification type, priority, template, selected customers)
	const watchedRecipientType = form.watch("recipientType");
	const watchedChannels = form.watch("channels");
	const watchedNotificationType = form.watch("notificationType");
	const watchedPriority = form.watch("priority");
	const watchedTemplateId = form.watch("templateId");

	useEffect(() => {
		saveStoredSelection(storeId, {
			recipientType: watchedRecipientType,
			channels: watchedChannels ?? [],
			notificationType: watchedNotificationType ?? "system",
			priority: watchedPriority ?? "0",
			templateId: watchedTemplateId ?? null,
			recipientIds:
				(watchedRecipientType === "single" ||
					watchedRecipientType === "multiple") &&
				selectedCustomers.length > 0
					? selectedCustomers.map((c) => c.id)
					: undefined,
		});
	}, [
		storeId,
		watchedRecipientType,
		watchedChannels,
		watchedNotificationType,
		watchedPriority,
		watchedTemplateId,
		selectedCustomers,
	]);

	const recipientType = form.watch("recipientType");

	const onSubmit = useCallback(
		async (data: FormValues) => {
			setIsSubmitting(true);
			try {
				// If selected customers, include their IDs
				if (
					data.recipientType === "single" ||
					data.recipientType === "multiple"
				) {
					if (selectedCustomers.length === 0) {
						toastError({
							title: "Error",
							description: "Please select at least one customer",
						});
						setIsSubmitting(false);
						return;
					}
					data.recipientIds = selectedCustomers.map((c) => c.id);
				}

				const result = await sendStoreNotificationAction(storeId, data);

				if (result?.serverError) {
					toastError({
						title: "Error",
						description: result.serverError,
					});
				} else {
					toastSuccess({
						description: `Notification sent successfully! Total: ${result?.data?.total || 0}, Successful: ${result?.data?.successful || 0}, Failed: ${result?.data?.failed || 0}`,
					});
					// Reset form
					form.reset();
					setSelectedCustomers([]);
				}
			} catch (error: any) {
				toastError({
					title: "Error",
					description: error?.message || "Failed to send notification",
				});
			} finally {
				setIsSubmitting(false);
			}
		},
		[form, selectedCustomers, storeId],
	);

	const handleCustomerSelect = useCallback((customer: User) => {
		setSelectedCustomers((prev) => {
			if (prev.find((c) => c.id === customer.id)) {
				return prev; // Already selected
			}
			return [...prev, customer];
		});
	}, []);

	const handleCustomerRemove = useCallback((customerId: string) => {
		setSelectedCustomers((prev) => prev.filter((c) => c.id !== customerId));
	}, []);

	return (
		<div className="space-y-6">
			<Heading
				title={t("send_notification")}
				description={t("send_notification_descr")}
			/>
			<Separator />

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
					{/* Recipients */}
					<Card>
						<CardHeader>
							<CardTitle>{t("recipients")}</CardTitle>
							<CardDescription>{t("choose_recipients_descr")}</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<FormField
								control={form.control}
								name="recipientType"
								render={({ field }) => (
									<FormItem className="space-y-3">
										<FormControl>
											<RadioGroup
												onValueChange={field.onChange}
												value={field.value}
												className="flex flex-col space-y-1"
											>
												<FormItem className="flex items-center space-x-3 space-y-0">
													<FormControl>
														<RadioGroupItem value="single" />
													</FormControl>
													<FormLabel className="font-normal">
														{t("single_customer")}
													</FormLabel>
												</FormItem>
												<FormItem className="flex items-center space-x-3 space-y-0">
													<FormControl>
														<RadioGroupItem value="multiple" />
													</FormControl>
													<FormLabel className="font-normal">
														{t("multiple_customers")}
													</FormLabel>
												</FormItem>
												<FormItem className="flex items-center space-x-3 space-y-0">
													<FormControl>
														<RadioGroupItem value="all" />
													</FormControl>
													<FormLabel className="font-normal">
														{t("all_store_customers")}
													</FormLabel>
												</FormItem>
											</RadioGroup>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							{(recipientType === "single" || recipientType === "multiple") && (
								<div className="space-y-2">
									<StoreMembersCombobox
										storeId={storeId}
										storeMembers={customers as User[]}
										disabled={isSubmitting}
										onValueChange={handleCustomerSelect}
									/>
									{selectedCustomers.length > 0 && (
										<div className="flex flex-wrap gap-2">
											{selectedCustomers.map((customer) => (
												<div
													key={customer.id}
													className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
												>
													<span>
														{customer.name || customer.email || customer.id}
													</span>
													<button
														type="button"
														onClick={() => handleCustomerRemove(customer.id)}
														className="text-muted-foreground hover:text-foreground"
													>
														×
													</button>
												</div>
											))}
										</div>
									)}
									<p className="text-sm text-muted-foreground">
										{selectedCustomers.length} customer
										{selectedCustomers.length !== 1 ? "s" : ""} selected
									</p>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Channels */}
					<Card>
						<CardHeader>
							<CardTitle>{t("channels")}</CardTitle>
							<CardDescription>{t("select_channels_descr")}</CardDescription>
						</CardHeader>
						<CardContent>
							<FormField
								control={form.control}
								name="channels"
								render={() => (
									<FormItem>
										<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
											{Object.entries(channelLabels)
												.filter(([key]) => enabledChannels.includes(key))
												.map(([value, label]) => (
													<FormField
														key={value}
														control={form.control}
														name="channels"
														render={({ field }) => {
															return (
																<FormItem
																	key={value}
																	className="flex flex-row items-start space-x-3 space-y-0"
																>
																	<FormControl>
																		<Checkbox
																			checked={field.value?.includes(
																				value as any,
																			)}
																			onCheckedChange={(checked) => {
																				return checked
																					? field.onChange([
																							...field.value,
																							value,
																						])
																					: field.onChange(
																							field.value?.filter(
																								(val) => val !== value,
																							),
																						);
																			}}
																		/>
																	</FormControl>
																	<FormLabel className="font-normal">
																		{label}
																	</FormLabel>
																</FormItem>
															);
														}}
													/>
												))}
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>
						</CardContent>
					</Card>

					{/* Notification Details */}
					<Card>
						<CardHeader>
							<CardTitle>{t("notification_details")}</CardTitle>
							<CardDescription>
								{t("enter_notification_content")}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<FormField
								control={form.control}
								name="notificationType"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("type")} <span className="text-destructive">*</span>
										</FormLabel>
										<Select onValueChange={field.onChange} value={field.value}>
											<FormControl>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{Object.entries(notificationTypeLabels).map(
													([value, label]) => (
														<SelectItem key={value} value={value}>
															{label}
														</SelectItem>
													),
												)}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="subject"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("subject")} <span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												{...field}
												placeholder={t("notification_subject_placeholder")}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="message"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("message")} <span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Textarea
												{...field}
												placeholder={t("notification_message_placeholder")}
												rows={6}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="templateId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("template")}</FormLabel>
										<Select
											onValueChange={(value) =>
												field.onChange(value === "--" ? null : value)
											}
											value={field.value || "--"}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue
														placeholder={t("select_template_optional")}
													/>
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="--">{t("none")}</SelectItem>
												{messageTemplates.map((template) => (
													<SelectItem key={template.id} value={template.id}>
														{template.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("template_description")}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="priority"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("priority")}</FormLabel>
										<Select onValueChange={field.onChange} value={field.value}>
											<FormControl>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{Object.entries(priorityLabels).map(
													([value, label]) => (
														<SelectItem key={value} value={value}>
															{label}
														</SelectItem>
													),
												)}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="actionUrl"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("action_url")}</FormLabel>
										<FormControl>
											<Input
												{...field}
												value={field.value || ""}
												placeholder="https://example.com/action"
												type="url"
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("action_url_description")}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</CardContent>
					</Card>

					{/* Actions */}
					<div className="flex gap-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								form.reset({
									recipientType: "all",
									channels: ["onsite", "email"],
									notificationType: "system",
									subject: "",
									message: "",
									templateId: null,
									priority: "0",
									actionUrl: null,
								});
								setSelectedCustomers([]);
								if (typeof window !== "undefined") {
									try {
										window.localStorage.removeItem(
											`${SELECTION_STORAGE_KEY_PREFIX}${storeId}`,
										);
									} catch {
										// ignore
									}
								}
							}}
							disabled={isSubmitting}
						>
							{t("reset")}
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? (
								<>
									<IconLoader className="mr-2 h-4 w-4 animate-spin" />
									{t("sending")}
								</>
							) : (
								t("send_notification_button")
							)}
						</Button>
					</div>
				</form>
			</Form>
		</div>
	);
}
