"use client";

import { createRsvpBlacklistAction } from "@/actions/storeAdmin/rsvp-blacklist/create-rsvp-blacklist";
import { createRsvpBlacklistSchema } from "@/actions/storeAdmin/rsvp-blacklist/create-rsvp-blacklist.validation";
import { updateRsvpBlacklistAction } from "@/actions/storeAdmin/rsvp-blacklist/update-rsvp-blacklist";
import {
	updateRsvpBlacklistSchema,
	type UpdateRsvpBlacklistInput,
} from "@/actions/storeAdmin/rsvp-blacklist/update-rsvp-blacklist.validation";
import { useTranslation } from "@/app/i18n/client";
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
import { useI18n } from "@/providers/i18n-provider";
import type { RsvpBlacklistColumn } from "./rsvp-blacklist-column";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { UserCombobox } from "@/components/user-combobox";
import { getCustomersAction } from "@/actions/storeAdmin/customer/get-customers";

interface EditRsvpBlacklistDialogProps {
	blacklist?: RsvpBlacklistColumn | null;
	isNew?: boolean;
	trigger?: React.ReactNode;
	onCreated?: (blacklist: RsvpBlacklistColumn) => void;
	onUpdated?: (blacklist: RsvpBlacklistColumn) => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function EditRsvpBlacklistDialog({
	blacklist,
	isNew = false,
	trigger,
	onCreated,
	onUpdated,
	open,
	onOpenChange,
}: EditRsvpBlacklistDialogProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [internalOpen, setInternalOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [users, setUsers] = useState<
		Array<{ id: string; name: string | null; email: string | null }>
	>([]);
	const [loadingUsers, setLoadingUsers] = useState(false);

	const isEditMode = Boolean(blacklist) && !isNew;

	const defaultValues = blacklist
		? {
				...blacklist,
			}
		: {
				storeId: String(params.storeId),
				id: "",
				userId: "",
			};

	// Use createRsvpBlacklistSchema when isNew, updateRsvpBlacklistSchema when editing
	const schema = useMemo(
		() => (isEditMode ? updateRsvpBlacklistSchema : createRsvpBlacklistSchema),
		[isEditMode],
	);

	// Form input type: UpdateRsvpBlacklistInput when editing, CreateRsvpBlacklistInput when creating
	type FormInput = Omit<UpdateRsvpBlacklistInput, "id"> & { id?: string };

	const form = useForm<FormInput>({
		resolver: zodResolver(schema) as Resolver<FormInput>,
		defaultValues,
		mode: "onChange",
		reValidateMode: "onChange",
	});

	const {
		formState: { errors },
		handleSubmit,
	} = form;

	const isControlled = typeof open === "boolean";
	const dialogOpen = isControlled ? open : internalOpen;

	// Fetch users when dialog opens
	useEffect(() => {
		if (dialogOpen && users.length === 0) {
			setLoadingUsers(true);
			getCustomersAction(String(params.storeId), {})
				.then((result) => {
					if (result?.data?.users) {
						setUsers(
							result.data.users.map(
								(u: {
									id: string;
									name: string | null;
									email: string | null;
								}) => ({
									id: u.id,
									name: u.name,
									email: u.email,
								}),
							),
						);
					}
				})
				.catch((error) => {
					toastError({
						title: t("error_title"),
						description: error instanceof Error ? error.message : String(error),
					});
				})
				.finally(() => {
					setLoadingUsers(false);
				});
		}
	}, [dialogOpen, params.storeId, users.length, t]);

	const resetForm = useCallback(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	const handleOpenChange = (nextOpen: boolean) => {
		if (!isControlled) {
			setInternalOpen(nextOpen);
		}
		onOpenChange?.(nextOpen);
		if (!nextOpen) {
			resetForm();
		}
	};

	const handleSuccess = (updatedBlacklist: RsvpBlacklistColumn) => {
		if (isEditMode) {
			onUpdated?.(updatedBlacklist);
		} else {
			onCreated?.(updatedBlacklist);
		}

		toastSuccess({
			title: t("rsvp_Blacklist") + " " + t(isEditMode ? "updated" : "created"),
			description: "",
		});

		resetForm();
		handleOpenChange(false);
	};

	const onSubmit = async (values: FormInput) => {
		try {
			setLoading(true);

			if (!isEditMode) {
				const result = await createRsvpBlacklistAction(String(params.storeId), {
					userId: values.userId,
				});

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.blacklist) {
					handleSuccess(result.data.blacklist);
				}
			} else {
				const result = await updateRsvpBlacklistAction(String(params.storeId), {
					id: values.id!,
					userId: values.userId,
				});

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.blacklist) {
					handleSuccess(result.data.blacklist);
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

	const selectedUser = users.find((u) => u.id === form.watch("userId"));

	return (
		<Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
			{trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>
						{isEditMode
							? t("edit_rsvp_blacklist") || "Edit Blacklist Entry"
							: t("add_rsvp_blacklist") || "Add to Blacklist"}
					</DialogTitle>
					<DialogDescription>
						{isEditMode
							? t("edit_rsvp_blacklist_description") ||
								"Update the blacklist entry for this user"
							: t("add_rsvp_blacklist_description") ||
								"Select a user to add to the blacklist"}
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="userId"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("user") || "User"}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										{loadingUsers ? (
											<div className="text-sm text-muted-foreground">
												{t("loading") || "Loading users..."}
											</div>
										) : (
											<UserCombobox
												users={users}
												value={field.value}
												onValueChange={field.onChange}
												disabled={loading}
											/>
										)}
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{selectedUser && (
							<div className="text-sm text-muted-foreground">
								{selectedUser.name && (
									<div>
										{t("your_name") || "Your Name"}: {selectedUser.name}
									</div>
								)}
								{selectedUser.email && (
									<div>
										{t("user_email") || "Email"}: {selectedUser.email}
									</div>
								)}
							</div>
						)}

						{/* Validation Error Summary */}
						{Object.keys(form.formState.errors).length > 0 && (
							<div className="rounded-md bg-destructive/15 border border-destructive/50 p-3 space-y-1.5">
								<div className="text-sm font-semibold text-destructive">
									{t("please_fix_validation_errors") ||
										"Please fix the following errors:"}
								</div>
								{Object.entries(form.formState.errors).map(([field, error]) => {
									// Map field names to user-friendly labels using i18n
									const fieldLabels: Record<string, string> = {
										userId: t("User") || "User",
										storeId: t("Store") || "Store",
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

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => handleOpenChange(false)}
								disabled={loading}
							>
								{t("cancel")}
							</Button>
							<Button
								type="submit"
								disabled={
									loading ||
									loadingUsers ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
								className="disabled:opacity-25"
							>
								{loading
									? t("saving") || "Saving..."
									: isEditMode
										? t("save")
										: t("add")}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
