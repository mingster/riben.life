"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { createSysAdminStoreAction } from "@/actions/sysAdmin/store/create-sysadmin-store";
import {
	type CreateSysAdminStoreInput,
	createSysAdminStoreSchema,
} from "@/actions/sysAdmin/store/create-sysadmin-store.validation";
import { updateSysAdminStoreAction } from "@/actions/sysAdmin/store/update-sysadmin-store";
import {
	type UpdateSysAdminStoreInput,
	updateSysAdminStoreSchema,
} from "@/actions/sysAdmin/store/update-sysadmin-store.validation";
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
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import {
	type SysAdminOrganizationOption,
	type SysAdminStoreRow,
	type SysAdminUserOption,
	toSysAdminStoreRow,
} from "../store-column";

interface CreateSysAdminStoreDialogProps {
	organizations: SysAdminOrganizationOption[];
	users: SysAdminUserOption[];
	onCreated: (row: SysAdminStoreRow) => void;
}

export function CreateSysAdminStoreDialog({
	organizations,
	users,
	onCreated,
}: CreateSysAdminStoreDialogProps) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const defaultOrgId = organizations[0]?.id ?? "";
	const defaultOwnerId = users[0]?.id ?? "";

	const form = useForm<CreateSysAdminStoreInput>({
		resolver: zodResolver(createSysAdminStoreSchema),
		defaultValues: {
			name: "",
			organizationId: defaultOrgId,
			ownerId: defaultOwnerId,
			defaultCountry: "TW",
			defaultCurrency: "twd",
			defaultLocale: "tw",
		},
		mode: "onChange",
	});

	const onSubmit = async (data: CreateSysAdminStoreInput) => {
		setLoading(true);
		try {
			const result = await createSysAdminStoreAction(data);
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			if (result?.data?.store) {
				onCreated(toSysAdminStoreRow(result.data.store));
				toastSuccess({ description: "Store created." });
				setOpen(false);
				form.reset({
					name: "",
					organizationId: defaultOrgId,
					ownerId: defaultOwnerId,
					defaultCountry: "TW",
					defaultCurrency: "twd",
					defaultLocale: "tw",
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
					Create store
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Create store</DialogTitle>
					<DialogDescription>
						Attach a new store to an organization and owner. Default payment and
						shipping methods are applied from platform defaults.
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
								name="organizationId"
								render={({ field, fieldState }) => (
									<FormItem
										className={cn(
											fieldState.error &&
												"rounded-md border border-destructive/50 bg-destructive/5 p-2",
										)}
									>
										<FormLabel>
											Organization <span className="text-destructive">*</span>
										</FormLabel>
										<Select
											disabled={loading}
											onValueChange={field.onChange}
											value={field.value}
										>
											<FormControl>
												<SelectTrigger
													className={cn(
														fieldState.error &&
															"border-destructive focus-visible:ring-destructive",
													)}
												>
													<SelectValue placeholder="Select organization" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{organizations.map((o) => (
													<SelectItem key={o.id} value={o.id}>
														{o.name} ({o.slug})
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
								name="ownerId"
								render={({ field, fieldState }) => (
									<FormItem
										className={cn(
											fieldState.error &&
												"rounded-md border border-destructive/50 bg-destructive/5 p-2",
										)}
									>
										<FormLabel>
											Owner user <span className="text-destructive">*</span>
										</FormLabel>
										<Select
											disabled={loading}
											onValueChange={field.onChange}
											value={field.value}
										>
											<FormControl>
												<SelectTrigger
													className={cn(
														fieldState.error &&
															"border-destructive focus-visible:ring-destructive",
													)}
												>
													<SelectValue placeholder="Select user" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{users.map((u) => (
													<SelectItem key={u.id} value={u.id}>
														{u.name ?? u.email ?? u.id}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
							<div className="grid gap-4 sm:grid-cols-3">
								<FormField
									control={form.control}
									name="defaultCountry"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Country</FormLabel>
											<FormControl>
												<Input disabled={loading} {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="defaultCurrency"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Currency</FormLabel>
											<FormControl>
												<Input disabled={loading} {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="defaultLocale"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Locale</FormLabel>
											<FormControl>
												<Input disabled={loading} {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<Button
								type="submit"
								disabled={loading || !form.formState.isValid}
								className="touch-manipulation"
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

interface EditSysAdminStoreDialogProps {
	store: SysAdminStoreRow;
	onUpdated: (row: SysAdminStoreRow) => void;
	trigger?: React.ReactNode;
}

export function EditSysAdminStoreDialog({
	store,
	onUpdated,
	trigger,
}: EditSysAdminStoreDialogProps) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const defaultValues = useMemo<UpdateSysAdminStoreInput>(
		() => ({
			id: store.id,
			name: store.name,
			defaultCountry: store.defaultCountry,
			defaultCurrency: store.defaultCurrency,
			defaultLocale: store.defaultLocale,
			isOpen: store.isOpen,
			acceptAnonymousOrder: store.acceptAnonymousOrder,
			autoAcceptOrder: store.autoAcceptOrder,
		}),
		[store],
	);

	const form = useForm<UpdateSysAdminStoreInput>({
		resolver: zodResolver(updateSysAdminStoreSchema),
		defaultValues,
		mode: "onChange",
	});

	useEffect(() => {
		if (open) {
			form.reset(defaultValues);
		}
	}, [open, defaultValues, form]);

	const onSubmit = async (data: UpdateSysAdminStoreInput) => {
		setLoading(true);
		try {
			const result = await updateSysAdminStoreAction(data);
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			if (result?.data?.store) {
				onUpdated(toSysAdminStoreRow(result.data.store));
				toastSuccess({ description: "Store updated." });
				setOpen(false);
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{trigger ? (
				<DialogTrigger asChild>{trigger}</DialogTrigger>
			) : (
				<DialogTrigger asChild>
					<Button variant="outline" size="sm" className="touch-manipulation">
						Edit
					</Button>
				</DialogTrigger>
			)}
			<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Edit store</DialogTitle>
					<DialogDescription>
						Update storefront flags and defaults. Organization and owner are not
						changed here.
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
							<div className="grid gap-4 sm:grid-cols-3">
								<FormField
									control={form.control}
									name="defaultCountry"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Country</FormLabel>
											<FormControl>
												<Input disabled={loading} {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="defaultCurrency"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Currency</FormLabel>
											<FormControl>
												<Input disabled={loading} {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="defaultLocale"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Locale</FormLabel>
											<FormControl>
												<Input disabled={loading} {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<FormField
								control={form.control}
								name="isOpen"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
										<FormLabel>Open</FormLabel>
										<FormControl>
											<Switch
												disabled={loading}
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="acceptAnonymousOrder"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
										<FormLabel>Accept anonymous orders</FormLabel>
										<FormControl>
											<Switch
												disabled={loading}
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="autoAcceptOrder"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
										<FormLabel>Auto-accept orders</FormLabel>
										<FormControl>
											<Switch
												disabled={loading}
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
									</FormItem>
								)}
							/>
							<Button
								type="submit"
								disabled={loading || !form.formState.isValid}
								className="touch-manipulation"
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
