"use client";

import { useState, useCallback } from "react";
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
import { sendSystemNotificationAction } from "@/actions/sysAdmin/notification/send-system-notification";
import { sendSystemNotificationSchema } from "@/actions/sysAdmin/notification/send-system-notification.validation";
import { toastError, toastSuccess } from "@/components/toaster";
import { UserCombobox } from "@/app/sysAdmin/users/components/combobox-user";
import type { User } from "@/types";
import { IconLoader } from "@tabler/icons-react";

interface ClientSendNotificationProps {
	users: Array<{
		id: string;
		name: string | null;
		email: string | null;
	}>;
	messageTemplates: Array<{
		id: string;
		name: string;
	}>;
}

import type { SendSystemNotificationInput } from "@/actions/sysAdmin/notification/send-system-notification.validation";

type FormValues = SendSystemNotificationInput;

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

export function ClientSendNotification({
	users,
	messageTemplates,
}: ClientSendNotificationProps) {
	const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const form = useForm<FormValues>({
		resolver: zodResolver(sendSystemNotificationSchema) as any,
		defaultValues: {
			recipientType: "all",
			channels: ["onsite", "email"],
			subject: "",
			message: "",
			templateId: null,
			priority: "0",
			actionUrl: null,
		},
	});

	const recipientType = form.watch("recipientType");

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
					// Reset form
					form.reset();
					setSelectedUsers([]);
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
		[form, selectedUsers],
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
							<CardTitle>Notification Details</CardTitle>
							<CardDescription>
								Enter the notification content and settings
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<FormField
								control={form.control}
								name="subject"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											Subject <span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input {...field} placeholder="Notification subject" />
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

							<FormField
								control={form.control}
								name="templateId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Template</FormLabel>
										<Select
											onValueChange={field.onChange}
											value={field.value || undefined}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select a template (optional)" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="--">None</SelectItem>
												{messageTemplates.map((template) => (
													<SelectItem key={template.id} value={template.id}>
														{template.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormDescription>
											Optional: Use a message template for consistent formatting
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
										<FormLabel>Priority</FormLabel>
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
										<FormLabel>Action URL</FormLabel>
										<FormControl>
											<Input
												{...field}
												value={field.value || ""}
												placeholder="https://example.com/action"
												type="url"
											/>
										</FormControl>
										<FormDescription>
											Optional: Deep link URL for action buttons
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</CardContent>
					</Card>

					{/* Actions */}
					<div className="flex justify-end gap-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								form.reset();
								setSelectedUsers([]);
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
	);
}
