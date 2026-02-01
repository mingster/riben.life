"use client";

import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useWindowSize } from "usehooks-ts";
import type { z } from "zod";

import { updateMessageQueueAction } from "@/actions/sysAdmin/messageQueue/update-message-queue";
import {
	UpdateMessageQueueInput,
	updateMessageQueueSchema,
} from "@/actions/sysAdmin/messageQueue/update-message-queue.validation";
import { Loader } from "@/components/loader";
import { toastError, toastSuccess } from "@/components/toaster";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/providers/i18n-provider";
import type { MessageQueue } from "@/types";
import { IconEdit, IconPlus } from "@tabler/icons-react";
import logger from "@/lib/logger";

interface props {
	item: z.infer<typeof updateMessageQueueSchema> | MessageQueue;
	onUpdated?: (newValue: MessageQueue) => void;
	isNew?: boolean;
	stores?: Array<{ id: string; name: string | null }>;
	users?: Array<{ id: string; name: string | null; email: string | null }>;
}

export const EditMessageQueue: React.FC<props> = ({
	item,
	onUpdated,
	isNew,
	stores = [],
	users = [],
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const windowSize = useWindowSize();
	const isMobile = windowSize.width < 768;

	const defaultValues = item
		? {
				...item,
				senderId: item.senderId || "",
				recipientId: item.recipientId || "",
				storeId: item.storeId || null,
				notificationType: item.notificationType || null,
				actionUrl: item.actionUrl || "",
				priority: item.priority ?? 0,
				isRead: item.isRead ?? false,
				isDeletedByAuthor: item.isDeletedByAuthor ?? false,
				isDeletedByRecipient: item.isDeletedByRecipient ?? false,
			}
		: {
				id: "new",
				senderId: "",
				recipientId: "",
				storeId: null,
				subject: "",
				message: "",
				notificationType: null,
				actionUrl: "",
				priority: 0,
				isRead: false,
				isDeletedByAuthor: false,
				isDeletedByRecipient: false,
			};

	const form = useForm<UpdateMessageQueueInput>({
		resolver: zodResolver(updateMessageQueueSchema) as any,
		defaultValues,
		mode: "onChange",
	});

	async function onSubmit(data: UpdateMessageQueueInput) {
		logger.info("data");
		setLoading(true);
		const result = await updateMessageQueueAction(data);
		if (!result) {
			toastError({ description: "An error occurred" });
		} else if (result.serverError) {
			toastError({ description: result.serverError });
		} else if (result.data) {
			onUpdated?.(result.data);

			if (isNew) {
				data.id = result.data.id;
				toastSuccess({ description: "Message created." });
			} else {
				toastSuccess({ description: "Message updated." });
			}
		}
		setLoading(false);
		setIsOpen(false);
	}

	return (
		<>
			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogTrigger asChild>
					{isNew ? (
						<Button variant="outline" size="sm">
							<IconPlus className="mr-2 h-4 w-4" />
							Add
						</Button>
					) : (
						<Button variant="ghost" size="icon" className="h-8 w-8">
							<IconEdit className="h-4 w-4" />
						</Button>
					)}
				</DialogTrigger>
				<DialogContent
					className={isMobile ? "max-w-[calc(100vw-2rem)]" : "max-w-2xl"}
				>
					<DialogHeader>
						<DialogTitle>
							{isNew ? "Create Message" : "Edit Message"}
						</DialogTitle>
						<DialogDescription>
							{isNew
								? "Create a new message in the queue."
								: "Edit message details."}
						</DialogDescription>
					</DialogHeader>
					<div className="relative">
						{(loading || form.formState.isSubmitting) && (
							<div
								className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]"
								aria-hidden="true"
							>
								<div className="flex flex-col items-center gap-3">
									<Loader />
									<span className="text-sm font-medium text-muted-foreground">
										Saving...
									</span>
								</div>
							</div>
						)}
						<Form {...form}>
							<form
								onSubmit={form.handleSubmit(onSubmit)}
								className="space-y-4"
							>
								<FormField
									control={form.control}
									name="senderId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Sender <span className="text-destructive">*</span>
											</FormLabel>
											<Select
												onValueChange={field.onChange}
												defaultValue={field.value}
												disabled={loading || form.formState.isSubmitting}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select sender" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{users.map((user) => (
														<SelectItem key={user.id} value={user.id}>
															{user.name || user.email || user.id}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="recipientId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Recipient <span className="text-destructive">*</span>
											</FormLabel>
											<Select
												onValueChange={field.onChange}
												defaultValue={field.value}
												disabled={loading || form.formState.isSubmitting}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select recipient" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{users.map((user) => (
														<SelectItem key={user.id} value={user.id}>
															{user.name || user.email || user.id}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="storeId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Store</FormLabel>
											<Select
												disabled={loading || form.formState.isSubmitting}
												value={field.value || "--"}
												onValueChange={(value) =>
													field.onChange(value === "--" ? null : value)
												}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select a store (optional)" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="--">None</SelectItem>
													{stores.map((store) => (
														<SelectItem key={store.id} value={store.id}>
															{store.name || store.id}
														</SelectItem>
													))}
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
												Subject <span className="text-destructive">*</span>
											</FormLabel>
											<FormControl>
												<Input
													placeholder="Enter subject"
													{...field}
													disabled={loading || form.formState.isSubmitting}
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
													placeholder="Enter message"
													rows={5}
													{...field}
													disabled={loading || form.formState.isSubmitting}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="notificationType"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Notification Type</FormLabel>
											<FormControl>
												<Input
													placeholder="e.g., order, reservation, credit, system"
													{...field}
													value={field.value || ""}
													onChange={(e) => {
														const value = e.target.value;
														field.onChange(value === "" ? null : value);
													}}
													disabled={loading || form.formState.isSubmitting}
												/>
											</FormControl>
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
													placeholder="https://example.com/action"
													{...field}
													value={field.value || ""}
													onChange={(e) => {
														const value = e.target.value;
														field.onChange(value === "" ? null : value);
													}}
													disabled={loading || form.formState.isSubmitting}
													type="url"
												/>
											</FormControl>
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
											<Select
												onValueChange={(value) =>
													field.onChange(parseInt(value, 10))
												}
												defaultValue={String(field.value)}
												disabled={loading || form.formState.isSubmitting}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select priority" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="0">Normal</SelectItem>
													<SelectItem value="1">High</SelectItem>
													<SelectItem value="2">Urgent</SelectItem>
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>

								<div className="grid grid-cols-3 gap-4">
									<FormField
										control={form.control}
										name="isRead"
										render={({ field }) => (
											<FormItem className="flex flex-row items-start space-x-3 space-y-0">
												<FormControl>
													<Checkbox
														checked={field.value}
														onCheckedChange={field.onChange}
														disabled={loading || form.formState.isSubmitting}
													/>
												</FormControl>
												<div className="space-y-1 leading-none">
													<FormLabel>Is Read</FormLabel>
												</div>
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="isDeletedByAuthor"
										render={({ field }) => (
											<FormItem className="flex flex-row items-start space-x-3 space-y-0">
												<FormControl>
													<Checkbox
														checked={field.value}
														onCheckedChange={field.onChange}
														disabled={loading || form.formState.isSubmitting}
													/>
												</FormControl>
												<div className="space-y-1 leading-none">
													<FormLabel>Deleted by Author</FormLabel>
												</div>
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="isDeletedByRecipient"
										render={({ field }) => (
											<FormItem className="flex flex-row items-start space-x-3 space-y-0">
												<FormControl>
													<Checkbox
														checked={field.value}
														onCheckedChange={field.onChange}
														disabled={loading || form.formState.isSubmitting}
													/>
												</FormControl>
												<div className="space-y-1 leading-none">
													<FormLabel>Deleted by Recipient</FormLabel>
												</div>
											</FormItem>
										)}
									/>
								</div>

								<div className="flex justify-end gap-2">
									<Button
										type="button"
										variant="outline"
										onClick={() => setIsOpen(false)}
										disabled={loading || form.formState.isSubmitting}
									>
										Cancel
									</Button>
									<Button
										type="submit"
										disabled={loading || form.formState.isSubmitting}
									>
										{loading ? "Saving..." : isNew ? "Create" : "Save"}
									</Button>
								</div>
							</form>
						</Form>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
};
