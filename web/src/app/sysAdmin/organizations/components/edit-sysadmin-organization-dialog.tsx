"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconPencil, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { createSysAdminOrganizationAction } from "@/actions/sysAdmin/organization/create-sysadmin-organization";
import {
	type CreateSysAdminOrganizationInput,
	createSysAdminOrganizationSchema,
} from "@/actions/sysAdmin/organization/create-sysadmin-organization.validation";
import { updateSysAdminOrganizationAction } from "@/actions/sysAdmin/organization/update-sysadmin-organization";
import {
	type UpdateSysAdminOrganizationInput,
	updateSysAdminOrganizationSchema,
} from "@/actions/sysAdmin/organization/update-sysadmin-organization.validation";
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
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
	type SysAdminOrganizationRow,
	toSysAdminOrganizationRow,
} from "../organization-column";

interface CreateSysAdminOrganizationDialogProps {
	onCreated: (row: SysAdminOrganizationRow) => void;
}

export function CreateSysAdminOrganizationDialog({
	onCreated,
}: CreateSysAdminOrganizationDialogProps) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const form = useForm<CreateSysAdminOrganizationInput>({
		resolver: zodResolver(createSysAdminOrganizationSchema),
		defaultValues: {
			name: "",
			slug: "",
			logo: null,
			metadata: null,
		},
		mode: "onChange",
	});

	const onSubmit = async (data: CreateSysAdminOrganizationInput) => {
		setLoading(true);
		try {
			const result = await createSysAdminOrganizationAction(data);
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			if (result?.data?.organization) {
				onCreated(toSysAdminOrganizationRow(result.data.organization));
				toastSuccess({ description: "Organization created." });
				setOpen(false);
				form.reset({
					name: "",
					slug: "",
					logo: null,
					metadata: null,
				});
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button className="touch-manipulation">
					<IconPlus className="mr-2 size-4" />
					Create organization
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Create organization</DialogTitle>
					<DialogDescription>
						Slug must be unique and URL-safe (lowercase, hyphens). Use this to
						group stores and members.
					</DialogDescription>
				</DialogHeader>
				<div className="relative" aria-busy={loading}>
					{loading && (
						<div className="absolute inset-0 z-100 flex cursor-wait items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]">
							<Loader />
						</div>
					)}
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field, fieldState }) => (
									<FormItem
										className={cn(
											fieldState.error &&
												"rounded-md border border-destructive/50 bg-destructive/5 p-2",
										)}
									>
										<FormLabel>
											Name <span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												disabled={loading}
												className={cn(
													"h-10 text-base sm:h-9 sm:text-sm",
													fieldState.error &&
														"border-destructive focus-visible:ring-destructive",
												)}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="slug"
								render={({ field, fieldState }) => (
									<FormItem
										className={cn(
											fieldState.error &&
												"rounded-md border border-destructive/50 bg-destructive/5 p-2",
										)}
									>
										<FormLabel>
											Slug <span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												disabled={loading}
												placeholder="acme-corp"
												className={cn(
													"h-10 font-mono text-base sm:h-9 sm:text-sm",
													fieldState.error &&
														"border-destructive focus-visible:ring-destructive",
												)}
												{...field}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											Lowercase letters, numbers, and hyphens only.
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="logo"
								render={({ field, fieldState }) => (
									<FormItem
										className={cn(
											fieldState.error &&
												"rounded-md border border-destructive/50 bg-destructive/5 p-2",
										)}
									>
										<FormLabel>Logo URL</FormLabel>
										<FormControl>
											<Input
												disabled={loading}
												value={field.value ?? ""}
												onChange={(e) =>
													field.onChange(
														e.target.value === "" ? null : e.target.value,
													)
												}
												className={cn(
													"h-10 text-base sm:h-9 sm:text-sm",
													fieldState.error &&
														"border-destructive focus-visible:ring-destructive",
												)}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="metadata"
								render={({ field, fieldState }) => (
									<FormItem
										className={cn(
											fieldState.error &&
												"rounded-md border border-destructive/50 bg-destructive/5 p-2",
										)}
									>
										<FormLabel>Metadata</FormLabel>
										<FormControl>
											<Textarea
												disabled={loading}
												value={field.value ?? ""}
												onChange={(e) =>
													field.onChange(
														e.target.value === "" ? null : e.target.value,
													)
												}
												className={cn(
													"min-h-[80px] font-mono text-sm",
													fieldState.error &&
														"border-destructive focus-visible:ring-destructive",
												)}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											Optional JSON or notes (stored as text).
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button
								type="submit"
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
								className="touch-manipulation disabled:opacity-25"
							>
								Create
							</Button>
						</form>
					</Form>
				</div>
			</DialogContent>
		</Dialog>
	);
}

interface EditSysAdminOrganizationDialogProps {
	organization: SysAdminOrganizationRow;
	onUpdated: (row: SysAdminOrganizationRow) => void;
}

export function EditSysAdminOrganizationDialog({
	organization,
	onUpdated,
}: EditSysAdminOrganizationDialogProps) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const form = useForm<UpdateSysAdminOrganizationInput>({
		resolver: zodResolver(updateSysAdminOrganizationSchema),
		defaultValues: {
			id: organization.id,
			name: organization.name,
			slug: organization.slug,
			logo: organization.logo,
			metadata: organization.metadata,
		},
		mode: "onChange",
	});

	const onSubmit = async (data: UpdateSysAdminOrganizationInput) => {
		setLoading(true);
		try {
			const result = await updateSysAdminOrganizationAction(data);
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			if (result?.data?.organization) {
				onUpdated(toSysAdminOrganizationRow(result.data.organization));
				toastSuccess({ description: "Organization updated." });
				setOpen(false);
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (next) {
					form.reset({
						id: organization.id,
						name: organization.name,
						slug: organization.slug,
						logo: organization.logo,
						metadata: organization.metadata,
					});
				}
			}}
		>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="size-8 touch-manipulation"
					aria-label="Edit organization"
				>
					<IconPencil className="size-4" />
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Edit organization</DialogTitle>
					<DialogDescription>
						Update name, slug, or optional logo and metadata.
					</DialogDescription>
				</DialogHeader>
				<div className="relative" aria-busy={loading}>
					{loading && (
						<div className="absolute inset-0 z-100 flex cursor-wait items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]">
							<Loader />
						</div>
					)}
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field, fieldState }) => (
									<FormItem
										className={cn(
											fieldState.error &&
												"rounded-md border border-destructive/50 bg-destructive/5 p-2",
										)}
									>
										<FormLabel>
											Name <span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												disabled={loading}
												className={cn(
													"h-10 text-base sm:h-9 sm:text-sm",
													fieldState.error &&
														"border-destructive focus-visible:ring-destructive",
												)}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="slug"
								render={({ field, fieldState }) => (
									<FormItem
										className={cn(
											fieldState.error &&
												"rounded-md border border-destructive/50 bg-destructive/5 p-2",
										)}
									>
										<FormLabel>
											Slug <span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												disabled={loading}
												className={cn(
													"h-10 font-mono text-base sm:h-9 sm:text-sm",
													fieldState.error &&
														"border-destructive focus-visible:ring-destructive",
												)}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="logo"
								render={({ field, fieldState }) => (
									<FormItem
										className={cn(
											fieldState.error &&
												"rounded-md border border-destructive/50 bg-destructive/5 p-2",
										)}
									>
										<FormLabel>Logo URL</FormLabel>
										<FormControl>
											<Input
												disabled={loading}
												value={field.value ?? ""}
												onChange={(e) =>
													field.onChange(
														e.target.value === "" ? null : e.target.value,
													)
												}
												className={cn(
													"h-10 text-base sm:h-9 sm:text-sm",
													fieldState.error &&
														"border-destructive focus-visible:ring-destructive",
												)}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="metadata"
								render={({ field, fieldState }) => (
									<FormItem
										className={cn(
											fieldState.error &&
												"rounded-md border border-destructive/50 bg-destructive/5 p-2",
										)}
									>
										<FormLabel>Metadata</FormLabel>
										<FormControl>
											<Textarea
												disabled={loading}
												value={field.value ?? ""}
												onChange={(e) =>
													field.onChange(
														e.target.value === "" ? null : e.target.value,
													)
												}
												className={cn(
													"min-h-[80px] font-mono text-sm",
													fieldState.error &&
														"border-destructive focus-visible:ring-destructive",
												)}
											/>
										</FormControl>
										<FormDescription className="text-xs font-mono text-gray-500">
											Optional JSON or notes (stored as text).
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button
								type="submit"
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
								className="touch-manipulation disabled:opacity-25"
							>
								Save
							</Button>
						</form>
					</Form>
				</div>
			</DialogContent>
		</Dialog>
	);
}
