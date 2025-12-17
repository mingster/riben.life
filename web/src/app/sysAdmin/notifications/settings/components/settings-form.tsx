"use client";

import { useForm } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import type { z } from "zod/v4";
import { updateSystemNotificationSettingsSchema } from "@/actions/sysAdmin/notification/update-system-settings.validation";

interface SettingsFormProps {
	form: UseFormReturn<z.infer<typeof updateSystemNotificationSettingsSchema>>;
	onSubmit: (
		data: z.infer<typeof updateSystemNotificationSettingsSchema>,
	) => Promise<void>;
	loading: boolean;
}

export function SettingsForm({ form, onSubmit, loading }: SettingsFormProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				{/* Master Switch */}
				<div className="space-y-4">
					<div>
						<h3 className="text-lg font-medium">Master Switch</h3>
						<p className="text-sm text-muted-foreground">
							Enable or disable the notification system system-wide
						</p>
					</div>
					<FormField
						control={form.control}
						name="notificationsEnabled"
						render={({ field }) => (
							<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
								<div className="space-y-0.5">
									<FormLabel className="text-base">
										Enable Notifications System-Wide
									</FormLabel>
									<FormDescription>
										When disabled, no notifications will be sent across the
										entire platform
									</FormDescription>
								</div>
								<FormControl>
									<Switch
										checked={field.value}
										onCheckedChange={field.onChange}
										disabled={loading || form.formState.isSubmitting}
									/>
								</FormControl>
							</FormItem>
						)}
					/>
				</div>

				<Separator />

				{/* External Channel Plugins */}
				<div className="space-y-4">
					<div>
						<h3 className="text-lg font-medium">External Channel Plugins</h3>
						<p className="text-sm text-muted-foreground">
							Enable or disable external notification channel plugins
							system-wide. Built-in channels (On-Site, Email) are always
							enabled.
						</p>
					</div>

					<div className="space-y-3">
						<FormField
							control={form.control}
							name="lineEnabled"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
									<div className="space-y-0.5">
										<FormLabel className="text-base">LINE Messaging</FormLabel>
										<FormDescription>
											Enable LINE messaging plugin system-wide
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
											disabled={loading || form.formState.isSubmitting}
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="whatsappEnabled"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
									<div className="space-y-0.5">
										<FormLabel className="text-base">
											WhatsApp Business
										</FormLabel>
										<FormDescription>
											Enable WhatsApp Business plugin system-wide
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
											disabled={loading || form.formState.isSubmitting}
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="wechatEnabled"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
									<div className="space-y-0.5">
										<FormLabel className="text-base">
											WeChat Official Account
										</FormLabel>
										<FormDescription>
											Enable WeChat Official Account plugin system-wide
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
											disabled={loading || form.formState.isSubmitting}
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="smsEnabled"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
									<div className="space-y-0.5">
										<FormLabel className="text-base">SMS</FormLabel>
										<FormDescription>
											Enable SMS plugin system-wide
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
											disabled={loading || form.formState.isSubmitting}
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="telegramEnabled"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
									<div className="space-y-0.5">
										<FormLabel className="text-base">Telegram Bot</FormLabel>
										<FormDescription>
											Enable Telegram Bot plugin system-wide
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
											disabled={loading || form.formState.isSubmitting}
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="pushEnabled"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
									<div className="space-y-0.5">
										<FormLabel className="text-base">
											Push Notifications
										</FormLabel>
										<FormDescription>
											Enable Push notification plugin system-wide
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
											disabled={loading || form.formState.isSubmitting}
										/>
									</FormControl>
								</FormItem>
							)}
						/>
					</div>
				</div>

				<Separator />

				{/* Queue Configuration */}
				<div className="space-y-4">
					<div>
						<h3 className="text-lg font-medium">Queue Configuration</h3>
						<p className="text-sm text-muted-foreground">
							Configure notification queue processing and retry behavior
						</p>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<FormField
							control={form.control}
							name="maxRetryAttempts"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										Max Retry Attempts{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											min={1}
											max={10}
											disabled={loading || form.formState.isSubmitting}
											{...field}
											onChange={(e) => field.onChange(Number(e.target.value))}
										/>
									</FormControl>
									<FormDescription>
										Number of retry attempts for failed notifications (1-10)
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="retryBackoffMs"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										Retry Backoff (ms){" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											min={100}
											max={60000}
											disabled={loading || form.formState.isSubmitting}
											{...field}
											onChange={(e) => field.onChange(Number(e.target.value))}
										/>
									</FormControl>
									<FormDescription>
										Initial backoff delay in milliseconds (100-60000)
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="queueBatchSize"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										Queue Batch Size <span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											min={1}
											max={1000}
											disabled={loading || form.formState.isSubmitting}
											{...field}
											onChange={(e) => field.onChange(Number(e.target.value))}
										/>
									</FormControl>
									<FormDescription>
										Number of notifications to process per batch (1-1000)
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="rateLimitPerMinute"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										Rate Limit (per minute){" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											min={1}
											max={10000}
											disabled={loading || form.formState.isSubmitting}
											{...field}
											onChange={(e) => field.onChange(Number(e.target.value))}
										/>
									</FormControl>
									<FormDescription>
										Maximum notifications per minute (1-10000)
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				</div>

				<Separator />

				{/* History & Retention */}
				<div className="space-y-4">
					<div>
						<h3 className="text-lg font-medium">History & Retention</h3>
						<p className="text-sm text-muted-foreground">
							Configure notification history retention period
						</p>
					</div>

					<FormField
						control={form.control}
						name="historyRetentionDays"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									History Retention (days){" "}
									<span className="text-destructive">*</span>
								</FormLabel>
								<FormControl>
									<Input
										type="number"
										min={1}
										max={365}
										disabled={loading || form.formState.isSubmitting}
										{...field}
										onChange={(e) => field.onChange(Number(e.target.value))}
									/>
								</FormControl>
								<FormDescription>
									Days to keep notification history (1-365)
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<div className="flex justify-end gap-2">
					<Button
						type="submit"
						disabled={loading || form.formState.isSubmitting}
						className="disabled:opacity-25"
					>
						{loading || form.formState.isSubmitting
							? "Saving..."
							: "Save Changes"}
					</Button>
				</div>
			</form>
		</Form>
	);
}
