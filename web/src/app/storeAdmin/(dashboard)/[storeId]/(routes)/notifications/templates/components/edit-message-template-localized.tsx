"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useWindowSize } from "usehooks-ts";
import type { z } from "zod";
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

const EditorComp = dynamic(
	() => import("@/components/editor/EditorComponent"),
	{ ssr: false },
);

import { IconEdit, IconLoader, IconPlus } from "@tabler/icons-react";
import dynamic from "next/dynamic";
import { updateMessageTemplateLocalizedAction } from "@/actions/storeAdmin/notification/update-message-template-localized";
import { updateMessageTemplateLocalizedSchema } from "@/actions/sysAdmin/messageTemplateLocalized/update-message-template-localized.validation";
import { toastError, toastSuccess } from "@/components/toaster";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/providers/i18n-provider";
import type { Locale, MessageTemplateLocalized } from "@/types";
import logger from "@/lib/logger";
import { TemplateVariablePreview } from "@/components/notification/template-variable-preview";

interface props {
	item: z.infer<typeof updateMessageTemplateLocalizedSchema>;
	locales: Locale[];
	onUpdated?: (newValue: MessageTemplateLocalized) => void;
	isNew?: boolean;
	storeId: string;
	templateType?: string | null;
}

export const EditMessageTemplateLocalized: React.FC<props> = ({
	item,
	locales,
	onUpdated,
	isNew = false,
	storeId,
	templateType,
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
				bCCEmailAddresses: item.bCCEmailAddresses || undefined,
			}
		: {
				id: "new",
				messageTemplateId: "",
				localeId: "",
				subject: "",
				body: "",
				isActive: true,
				bCCEmailAddresses: undefined,
			};

	const form = useForm<z.infer<typeof updateMessageTemplateLocalizedSchema>>({
		resolver: zodResolver(updateMessageTemplateLocalizedSchema) as any,
		defaultValues,
		mode: "onChange",
	});

	const {
		register,
		formState: { errors },
		handleSubmit,
		clearErrors,
	} = form;

	// commit to db and return the updated category
	async function onSubmit(
		data: z.infer<typeof updateMessageTemplateLocalizedSchema>,
	) {
		setLoading(true);

		const result = await updateMessageTemplateLocalizedAction(storeId, data);
		if (!result) {
			toastError({ description: "An error occurred" });
		} else if (result.serverError) {
			toastError({ description: result.serverError });
		} else if (result.data) {
			// also update data from parent component or caller
			const updatedData = result.data as MessageTemplateLocalized;

			onUpdated?.(updatedData);

			if (data.id === "new") {
				toastSuccess({ description: "Message template localized created." });
			} else {
				// Check if this was a global template (copied to store)
				// The action handles the copy, so we just show a generic success message
				toastSuccess({ description: "Message template localized updated." });
			}
		}
		setLoading(false);
		setIsOpen(false);
	}

	return (
		<>
			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogTrigger asChild>
					{item === null || item.id === "new" ? (
						<Button
							variant={"outline"}
							onClick={() => {
								setIsOpen(true);
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
							<IconEdit className="mr-0 size-3" />
						</Button>
					)}
				</DialogTrigger>

				<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
					<DialogHeader className="">
						<DialogTitle>{t("message_template_localized")}</DialogTitle>
						<DialogDescription>
							{
								//display form error if any
							}
						</DialogDescription>
					</DialogHeader>

					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="space-y-2.5"
						>
							<FormField
								control={form.control}
								name="localeId"
								render={({ field }) => (
									<FormItem className="w-full">
										<FormLabel>
											{t("locale")} <span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Select
												disabled={
													loading || form.formState.isSubmitting || !isNew
												}
												value={field.value}
												onValueChange={field.onChange}
											>
												<SelectTrigger>
													<SelectValue placeholder={t("select_locale")} />
												</SelectTrigger>
												<SelectContent>
													{locales.map((locale) => (
														<SelectItem key={locale.id} value={locale.lng}>
															{locale.name} ({locale.id})
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="subject"
								render={({ field }) => (
									<FormItem className="w-full">
										<FormLabel>
											{t("subject")} <span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												placeholder={t("enter_subject")}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="bCCEmailAddresses"
								render={({ field }) => (
									<FormItem className="w-full">
										<FormLabel>{t("bcc_email_addresses")}</FormLabel>
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												placeholder={t("enter_bcc_email_addresses")}
												{...field}
												value={field.value || ""}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="body"
								render={({ field }) => (
									<FormItem className="w-full">
										<FormLabel>
											{t("body")} <span className="text-destructive">*</span>
										</FormLabel>
										<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
											<div className="lg:col-span-2">
												<FormControl>
													<EditorComp
														markdown={field.value || ""}
														onPChange={field.onChange}
													/>
												</FormControl>
												<FormMessage />
											</div>
											<div className="lg:col-span-1">
												<TemplateVariablePreview
													notificationType={templateType || null}
													onVariableSelect={(variable) => {
														// Insert variable at cursor position or append
														const currentValue = field.value || "";
														field.onChange(`${currentValue}${variable}`);
													}}
												/>
											</div>
										</div>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="isActive"
								render={({ field }) => (
									<FormItem className="flex flex-row items-start space-x-3 space-y-0">
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
												disabled={loading || form.formState.isSubmitting}
											/>
										</FormControl>
										<div className="space-y-1 leading-none">
											<FormLabel>{t("is_active")}</FormLabel>
										</div>
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
												messageTemplateId:
													t("Message_Template") || "Message Template",
												localeId: t("Locale") || "Locale",
												subject: t("Subject") || "Subject",
												body: t("Body") || "Body",
												isActive: t("Active") || "Active",
												bCCEmailAddresses:
													t("BCC_Email_Addresses") || "BCC Email Addresses",
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

							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => {
										setIsOpen(false);
										clearErrors();
									}}
									disabled={loading || form.formState.isSubmitting}
								>
									{t("cancel")}
								</Button>
								<Button
									type="submit"
									disabled={
										loading ||
										!form.formState.isValid ||
										form.formState.isSubmitting
									}
									className="disabled:opacity-25"
								>
									{loading || form.formState.isSubmitting ? (
										<>
											<IconLoader className="mr-2 h-4 w-4 animate-spin" />
											{t("saving")}
										</>
									) : (
										t("save")
									)}
								</Button>
							</div>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		</>
	);
};
