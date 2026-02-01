"use client";

import { updateSystemMessageAction } from "@/actions/sysAdmin/systemMessage/update-system-message";
import {
	type UpdateSystemMessageInput,
	updateSystemMessageSchema,
} from "@/actions/sysAdmin/systemMessage/update-system-message.validation";
import { useTranslation } from "@/app/i18n/client";
import { LocaleSelectItems } from "@/components/locale-select-items";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useWindowSize } from "usehooks-ts";
import type { z } from "zod/v4";

import { Loader } from "@/components/loader";
import { toastError, toastSuccess } from "@/components/toaster";
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
import {
	Select,
	SelectContent,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/providers/i18n-provider";
import type { SystemMessage } from "@/types";

interface props {
	item: z.infer<typeof updateSystemMessageSchema>;
	onUpdated?: (newValue: z.infer<typeof updateSystemMessageSchema>) => void;
}

//type formValues = z.infer<typeof updateSystemMessageSchema>;

export const EditSystemMessage: React.FC<props> = ({ item, onUpdated }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	//const router = useRouter();

	const { lng } = useI18n();
	//console.log('lng', lng);
	const { t } = useTranslation(lng);
	const windowSize = useWindowSize();
	const isMobile = windowSize.width < 768;

	const defaultValues = item
		? {
				...item,
			}
		: {
				id: "new",
				message: "new message",
				published: false,
			};

	const form = useForm<UpdateSystemMessageInput>({
		resolver: zodResolver(updateSystemMessageSchema),
		defaultValues,
		mode: "onChange",
	});

	const {
		register,
		formState: { errors },
		handleSubmit,
		clearErrors,
	} = form;

	//console.log("disabled", loading || form.formState.isSubmitting);

	async function onSubmit(data: UpdateSystemMessageInput) {
		//console.log("data", data);
		setLoading(true);
		const result = await updateSystemMessageAction(data);
		if (!result) {
			toastError({ description: "An error occurred" });
		} else if (result.serverError) {
			toastError({ description: result.serverError });
		} else if (result.data) {
			if (data.id === "new") {
				data.id = result.data.id;
				toastSuccess({ description: "Category created." });
			} else {
				toastSuccess({ description: "Category updated." });
			}
		}
		setLoading(false);
		setIsOpen(false);

		// also update data from parent component or caller
		onUpdated?.(data);
	}

	return (
		<>
			<Dialog
				//direction={isMobile ? "bottom" : "right"}
				open={isOpen}
				onOpenChange={setIsOpen}
			>
				<DialogTrigger asChild>
					{item === null || item.id === "new" ? (
						<Button
							variant={"outline"}
							onClick={() => {
								//open EditSystemMessage dialog
							}}
						>
							<IconPlus className="mr-0 size-4" />
							{t("create")}
						</Button>
					) : (
						<Button
							variant="link"
							className="text-foreground w-fit px-0 text-left"
							onClick={() => setIsOpen(true)}
						>
							{defaultValues.message}
						</Button>
					)}
				</DialogTrigger>

				<DialogContent className="space-y-2 w-full">
					<DialogHeader className="gap-1">
						<DialogTitle>edit system message</DialogTitle>
						<DialogDescription>
							{
								//display form error if any
								errors.message && (
									<div className="text-red-500">{errors.message.message}</div>
								)
							}
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
										{t("saving") || "Saving..."}
									</span>
								</div>
							</div>
						)}
						<Form {...form}>
							<form
								onSubmit={form.handleSubmit(onSubmit)}
								className="space-y-2.5"
							>
								<FormField
									control={form.control}
									name="localeId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Locale</FormLabel>
											<FormControl>
												<Select
													disabled={loading || form.formState.isSubmitting}
													onValueChange={field.onChange}
													defaultValue={field.value}
												>
													<SelectTrigger>
														<SelectValue placeholder="Select a default locale" />
													</SelectTrigger>
													<SelectContent>
														<LocaleSelectItems />
													</SelectContent>
												</Select>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="message"
									render={({ field }) => (
										<FormItem className="w-full">
											<FormLabel>Message</FormLabel>
											<FormControl>
												<Textarea
													disabled={loading || form.formState.isSubmitting}
													placeholder="Enter the message"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="published"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between p-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>Publish</FormLabel>
											</div>
											<FormControl>
												<Switch
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								{/* Validation Error Summary */}
								{Object.keys(form.formState.errors).length > 0 && (
									<div className="rounded-md bg-destructive/15 border border-destructive/50 p-3 space-y-1.5">
										<div className="text-sm font-semibold text-destructive">
											{t("please_fix_validation_errors") ||
												"Please fix the following errors:"}
										</div>
										{Object.entries(form.formState.errors).map(
											([field, error]) => {
												// Map field names to user-friendly labels using i18n
												const fieldLabels: Record<string, string> = {
													id: t("ID") || "ID",
													message: t("Message") || "Message",
													localeId: t("Locale") || "Locale",
													published: t("Published") || "Published",
												};
												const fieldLabel = fieldLabels[field] || field;
												return (
													<div
														key={field}
														className="text-sm text-destructive flex items-start gap-2"
													>
														<span className="font-medium">{fieldLabel}:</span>
														<span>{error.message as string}</span>
													</div>
												);
											},
										)}
									</div>
								)}

								<Button
									type="submit"
									disabled={
										loading ||
										!form.formState.isValid ||
										form.formState.isSubmitting
									}
									className="disabled:opacity-25"
								>
									{t("submit")}
								</Button>

								<Button
									type="button"
									variant="outline"
									onClick={() => {
										clearErrors();
										setIsOpen(false);
										//router.push(`/${params.storeId}/support`);
									}}
									className="ml-2"
								>
									{t("cancel")}
								</Button>
							</form>
						</Form>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default EditSystemMessage;
