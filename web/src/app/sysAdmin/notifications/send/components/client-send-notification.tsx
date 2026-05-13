"use client";

import { sendSystemNotificationAction } from "@/actions/sysAdmin/notification/send-system-notification";
import {
	sendSystemNotificationSchema,
	type SendSystemNotificationInput,
} from "@/actions/sysAdmin/notification/send-system-notification.validation";
import { UserCombobox } from "@/app/sysAdmin/users/components/combobox-user";
import { Heading } from "@/components/heading";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { User } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader } from "@tabler/icons-react";
import { Loader } from "@/components/loader";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";

interface ClientSendNotificationProps {
	users: Array<{
		id: string;
		name: string | null;
		email: string | null;
	}>;
	messageTemplates: Array<{
		id: string;
		name: string;
		templateType: string;
	}>;
	/** When set and present in `users`, defaults to Selected Users with this user. */
	currentUserId: string | null;
}

type FormValues = SendSystemNotificationInput;

function buildSendNotificationInitialState(
	users: ClientSendNotificationProps["users"],
	currentUserId: string | null,
): { values: FormValues; selectedUsers: User[] } {
	const base: FormValues = {
		recipientType: "all",
		channels: ["onsite", "email"],
		subject: "",
		message: "",
		templateId: null,
		templateSampleDomain: "none",
		priority: "0",
	};
	if (!currentUserId) {
		return { values: base, selectedUsers: [] };
	}
	const row = users.find((u) => u.id === currentUserId);
	if (!row) {
		return { values: base, selectedUsers: [] };
	}
	return {
		values: {
			...base,
			recipientType: "selected",
		},
		selectedUsers: [row as User],
	};
}

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

const CHANNELS_STORAGE_KEY = "sysAdmin_sendNotification_channels";
type NotificationChannel = FormValues["channels"][number];

function stripTemplateTypeSuffix(name: string, templateType: string): string {
	if (!templateType) return name;
	const suffix = `.${templateType}`;
	return name.endsWith(suffix) ? name.slice(0, -suffix.length) : name;
}

/**
 * Labels for the template dropdown: drop the trailing `.email` / `.line` etc.
 * because delivery channel is chosen separately. Disambiguate rare collisions
 * with a short id fragment (not the channel name).
 */
function computeTemplateSelectLabels(
	templates: Array<{ id: string; name: string; templateType: string }>,
): Map<string, string> {
	const stripped = templates.map((t) => ({
		id: t.id,
		stripped: stripTemplateTypeSuffix(t.name, t.templateType),
	}));
	const countByStripped = new Map<string, number>();
	for (const row of stripped) {
		countByStripped.set(
			row.stripped,
			(countByStripped.get(row.stripped) ?? 0) + 1,
		);
	}
	const out = new Map<string, string>();
	for (const row of stripped) {
		const n = countByStripped.get(row.stripped) ?? 1;
		if (n === 1) {
			out.set(row.id, row.stripped);
		} else {
			out.set(row.id, `${row.stripped} (${row.id.slice(0, 8)})`);
		}
	}
	return out;
}

export function ClientSendNotification({
	users,
	messageTemplates,
	currentUserId,
}: ClientSendNotificationProps) {
	const initialState = useMemo(
		() => buildSendNotificationInitialState(users, currentUserId),
		[users, currentUserId],
	);

	const [selectedUsers, setSelectedUsers] = useState<User[]>(
		() => initialState.selectedUsers,
	);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const form = useForm<FormValues>({
		resolver: zodResolver(sendSystemNotificationSchema) as Resolver<FormValues>,
		defaultValues: initialState.values,
	});

	const resetToDefaults = useCallback(() => {
		const next = buildSendNotificationInitialState(users, currentUserId);
		form.reset(next.values);
		setSelectedUsers(next.selectedUsers);
	}, [users, currentUserId, form]);

	const templateId = useWatch({ control: form.control, name: "templateId" });

	// Load previously selected channels from localStorage (if any)
	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			const stored = window.localStorage.getItem(CHANNELS_STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as FormValues["channels"];
				if (Array.isArray(parsed) && parsed.length > 0) {
					form.setValue("channels", parsed, { shouldDirty: false });
				}
			}
		} catch {
			// ignore parse errors and fall back to default
		}
	}, [form]);

	useEffect(() => {
		if (!templateId) {
			form.setValue("templateSampleDomain", "none", { shouldDirty: false });
		}
	}, [templateId, form]);

	useEffect(() => {
		if (templateId) {
			form.clearErrors(["subject", "message"]);
		}
	}, [templateId, form]);

	const recipientType = form.watch("recipientType");
	const channels = form.watch("channels");

	const channelSet = useMemo(
		() => new Set<NotificationChannel>(channels ?? []),
		[channels],
	);

	const templatesForSelect = useMemo(
		() =>
			messageTemplates.filter((t) =>
				channelSet.has(t.templateType as NotificationChannel),
			),
		[messageTemplates, channelSet],
	);

	const templateSelectLabels = useMemo(
		() => computeTemplateSelectLabels(templatesForSelect),
		[templatesForSelect],
	);

	useEffect(() => {
		const tid = form.getValues("templateId");
		if (!tid) return;
		const stillVisible = templatesForSelect.some((t) => t.id === tid);
		if (!stillVisible) {
			form.setValue("templateId", null, { shouldDirty: true });
		}
	}, [templatesForSelect, form]);

	// Persist channel selection to localStorage so it is remembered
	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!channels || channels.length === 0) return;
		try {
			window.localStorage.setItem(
				CHANNELS_STORAGE_KEY,
				JSON.stringify(channels),
			);
		} catch {
			// ignore storage errors
		}
	}, [channels]);

	const onSubmit = useCallback(
		async (data: FormValues) => {
			setIsSubmitting(true);
			try {
				// If selected users, include their IDs
				if (data.recipientType === "selected") {
					data.recipientIds = selectedUsers.map((u) => u.id);
				}

				const result = await sendSystemNotificationAction(data);

				if (result?.serverError) {
					toastError({
						title: "Error",
						description: result.serverError,
					});
				} else {
					toastSuccess({
						description: `Notification sent successfully! Total: ${result?.data?.total || 0}, Successful: ${result?.data?.successful || 0}, Failed: ${result?.data?.failed || 0}`,
					});
					resetToDefaults();
				}
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				toastError({
					title: "Error",
					description: message || "Failed to send notification",
				});
			} finally {
				setIsSubmitting(false);
			}
		},
		[form, selectedUsers, resetToDefaults],
	);

	const handleUserSelect = useCallback((user: User) => {
		setSelectedUsers((prev) => {
			if (prev.find((u) => u.id === user.id)) {
				return prev; // Already selected
			}
			return [...prev, user];
		});
	}, []);

	const handleUserRemove = useCallback((userId: string) => {
		setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
	}, []);

	return (
		<div className="space-y-6">
			<Heading
				title="Send System Notification"
				description="Send system-wide notifications to all users or specific user groups"
			/>
			<Separator />

			<div className="relative">
				{isSubmitting && (
					<div
						className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]"
						aria-hidden="true"
					>
						<div className="flex flex-col items-center gap-3">
							<Loader />
							<span className="text-sm font-medium text-muted-foreground">
								Sending...
							</span>
						</div>
					</div>
				)}
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						{/* Recipients */}
						<Card>
							<CardHeader>
								<CardTitle>Recipients</CardTitle>
								<CardDescription>
									Choose who should receive this notification
								</CardDescription>
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
															<RadioGroupItem value="all" />
														</FormControl>
														<FormLabel className="font-normal">
															All Users
														</FormLabel>
													</FormItem>
													<FormItem className="flex items-center space-x-3 space-y-0">
														<FormControl>
															<RadioGroupItem value="selected" />
														</FormControl>
														<FormLabel className="font-normal">
															Selected Users
														</FormLabel>
													</FormItem>
												</RadioGroup>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								{recipientType === "selected" && (
									<div className="space-y-2">
										<UserCombobox
											userData={users as User[]}
											disabled={isSubmitting}
											onValueChange={handleUserSelect}
										/>
										{selectedUsers.length > 0 && (
											<div className="flex flex-wrap gap-2">
												{selectedUsers.map((user) => (
													<div
														key={user.id}
														className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
													>
														<span>{user.name || user.email || user.id}</span>
														<button
															type="button"
															onClick={() => handleUserRemove(user.id)}
															className="text-muted-foreground hover:text-foreground"
														>
															×
														</button>
													</div>
												))}
											</div>
										)}
										<p className="text-sm text-muted-foreground">
											{selectedUsers.length} user
											{selectedUsers.length !== 1 ? "s" : ""} selected
										</p>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Channels */}
						<Card>
							<CardHeader>
								<CardTitle>Channels</CardTitle>
								<CardDescription>
									Select which channels to use for delivery
								</CardDescription>
							</CardHeader>
							<CardContent>
								<FormField
									control={form.control}
									name="channels"
									render={() => (
										<FormItem>
											<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
												{Object.entries(channelLabels).map(([value, label]) => (
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
																				value as NotificationChannel,
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
								<CardTitle>Notification Details</CardTitle>
								<CardDescription>
									{templateId
										? "Content comes from the selected template."
										: "Enter subject and message, or select a template."}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<FormField
									control={form.control}
									name="templateId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Template</FormLabel>
											<Select
												value={field.value ?? "--"}
												onValueChange={(value) =>
													field.onChange(value === "--" ? null : value)
												}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select a template (optional)" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="--">None</SelectItem>
													{templatesForSelect.map((template) => (
														<SelectItem key={template.id} value={template.id}>
															{templateSelectLabels.get(template.id) ??
																template.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormDescription className="text-xs font-mono text-gray-500">
												When set, subject and message are taken from the
												template.
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="templateSampleDomain"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Template sample placeholders</FormLabel>
											<Select
												value={field.value}
												onValueChange={field.onChange}
												disabled={!templateId}
											>
												<FormControl>
													<SelectTrigger className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation">
														<SelectValue placeholder="None" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="none">
														None (empty variables)
													</SelectItem>
													<SelectItem value="order">
														Order lifecycle sample
													</SelectItem>
													<SelectItem value="reservation">
														Reservation lifecycle sample
													</SelectItem>
													<SelectItem value="subscription">
														Subscription lifecycle sample
													</SelectItem>
												</SelectContent>
											</Select>
											<FormDescription className="text-xs font-mono text-gray-500">
												When a template is selected, pick which sample data
												fills {"{{placeholders}}"} for this test send (preview
												only).
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>

								{!templateId ? (
									<>
										<FormField
											control={form.control}
											name="subject"
											render={({ field }) => (
												<FormItem>
													<FormLabel>
														Subject <span className="text-destructive">*</span>
													</FormLabel>
													<FormControl>
														<Input
															{...field}
															placeholder="Notification subject"
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
														Message <span className="text-destructive">*</span>
													</FormLabel>
													<FormControl>
														<Textarea
															{...field}
															placeholder="Notification message"
															rows={6}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</>
								) : null}

								<FormField
									control={form.control}
									name="priority"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Priority</FormLabel>
											<Select
												onValueChange={field.onChange}
												value={field.value}
											>
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
							</CardContent>
						</Card>

						{/* Actions */}
						<div className="flex gap-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									resetToDefaults();
								}}
								disabled={isSubmitting}
							>
								Reset
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? (
									<>
										<IconLoader className="mr-2 h-4 w-4 animate-spin" />
										Sending...
									</>
								) : (
									"Send Notification"
								)}
							</Button>
						</div>
					</form>
				</Form>
			</div>
		</div>
	);
}
