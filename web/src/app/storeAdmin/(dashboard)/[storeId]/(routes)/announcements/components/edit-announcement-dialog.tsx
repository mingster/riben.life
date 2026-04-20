"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { createAnnouncementAction } from "@/actions/storeAdmin/announcements/create-announcement";
import {
	type CreateAnnouncementInput,
	createAnnouncementSchema,
} from "@/actions/storeAdmin/announcements/create-announcement.validation";
import { updateAnnouncementAction } from "@/actions/storeAdmin/announcements/update-announcement";
import { useTranslation } from "@/app/i18n/client";
import { MarkdownMdxEditor } from "@/components/editor/markdown-mdx-editor";
import { FormSubmitOverlay } from "@/components/form-submit-overlay";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
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
import { adminCrudUseFormProps } from "@/lib/admin-form-defaults";
import { useI18n } from "@/providers/i18n-provider";
import type { AnnouncementColumn } from "../announcement-column";

interface EditAnnouncementDialogProps {
	announcement?: AnnouncementColumn | null;
	isNew?: boolean;
	trigger?: React.ReactNode;
	onCreated?: (announcement: AnnouncementColumn) => void;
	onUpdated?: (announcement: AnnouncementColumn) => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function EditAnnouncementDialog({
	announcement,
	isNew = false,
	trigger,
	onCreated,
	onUpdated,
	open: controlledOpen,
	onOpenChange: setControlledOpen,
}: EditAnnouncementDialogProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const [internalOpen, setInternalOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const open = controlledOpen ?? internalOpen;
	const setOpen = setControlledOpen ?? setInternalOpen;

	const isEditMode = Boolean(announcement) && !isNew;

	const defaultValues = useMemo<CreateAnnouncementInput>(
		() => ({
			message: announcement?.message ?? "",
		}),
		[announcement],
	);

	const form = useForm<CreateAnnouncementInput>({
		...adminCrudUseFormProps,
		resolver: zodResolver(
			createAnnouncementSchema,
		) as Resolver<CreateAnnouncementInput>,
		defaultValues,
	});

	useEffect(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			setOpen(nextOpen);
			if (!nextOpen) {
				form.reset(defaultValues);
			}
		},
		[defaultValues, form, setOpen],
	);

	const handleSuccess = useCallback(
		(result: AnnouncementColumn) => {
			if (isEditMode) {
				onUpdated?.(result);
			} else {
				onCreated?.(result);
			}

			toastSuccess({
				title: isEditMode
					? t("announcement_updated")
					: t("announcement_created"),
				description: "",
			});

			form.reset(defaultValues);
			handleOpenChange(false);
		},
		[
			defaultValues,
			form,
			handleOpenChange,
			isEditMode,
			onCreated,
			onUpdated,
			t,
		],
	);

	const onSubmit = async (values: CreateAnnouncementInput) => {
		try {
			setLoading(true);

			if (isEditMode && announcement) {
				const result = await updateAnnouncementAction(String(params.storeId), {
					id: announcement.id,
					message: values.message,
				});

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.announcement) {
					handleSuccess(result.data.announcement);
				}
			} else {
				const result = await createAnnouncementAction(String(params.storeId), {
					message: values.message,
				});

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.announcement) {
					handleSuccess(result.data.announcement);
				}
			}
		} catch (error: unknown) {
			toastError({
				title: t("error_title"),
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setLoading(false);
		}
	};

	const isBusy = loading || form.formState.isSubmitting;

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			{trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
			<DialogContent className="max-w-[calc(100%-1rem)] p-4 sm:p-6 sm:max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEditMode
							? t("announcement") + t("edit")
							: t("announcement") + t("create")}
					</DialogTitle>
					<DialogDescription>{t("announcement_mgmt_descr")}</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="relative space-y-4"
						aria-busy={isBusy}
					>
						<FormSubmitOverlay
							visible={isBusy}
							statusText={t("submitting") ?? "Submitting…"}
						/>
						<FormField
							control={form.control}
							name="message"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("announcement_body")}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<MarkdownMdxEditor
											value={field.value}
											onChange={field.onChange}
											onBlur={field.onBlur}
											name={field.name}
											disabled={loading || form.formState.isSubmitting}
											minHeight={280}
											placeholder={t("announcement_body")}
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
								{Object.entries(form.formState.errors).map(([field, error]) => {
									const fieldLabels: Record<string, string> = {
										message: t("announcement_body") || "Message",
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
								})}
							</div>
						)}

						<div className="flex items-center justify-end space-x-2">
							<Button
								type="submit"
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
								className="disabled:opacity-25"
							>
								{isEditMode ? t("save") : t("create")}
							</Button>
							<DialogFooter className="sm:justify-start">
								<Button
									type="button"
									variant="outline"
									onClick={() => handleOpenChange(false)}
									disabled={loading || form.formState.isSubmitting}
								>
									{t("cancel")}
								</Button>
							</DialogFooter>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
