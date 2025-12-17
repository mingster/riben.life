"use client";

import { createCurrencyAction } from "@/actions/sysAdmin/currency/update-currency";
import { updateCurrencyAction } from "@/actions/sysAdmin/currency/update-currency";
import { updateCurrencySchema } from "@/actions/sysAdmin/currency/update-currency.validation";
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
import { Input } from "@/components/ui/input";
import { useI18n } from "@/providers/i18n-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import type { CurrencyColumn } from "../currency-column";

type FormValues = z.infer<typeof updateCurrencySchema>;

interface EditCurrencyDialogProps {
	currency?: CurrencyColumn | null;
	isNew?: boolean;
	trigger?: React.ReactNode;
	onCreated?: (currency: CurrencyColumn) => void;
	onUpdated?: (currency: CurrencyColumn) => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function EditCurrencyDialog({
	currency,
	isNew = false,
	trigger,
	onCreated,
	onUpdated,
	open: controlledOpen,
	onOpenChange: setControlledOpen,
}: EditCurrencyDialogProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "sysAdmin");

	const [internalOpen, setInternalOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const open = controlledOpen ?? internalOpen;
	const setOpen = setControlledOpen ?? setInternalOpen;

	const isEditMode = Boolean(currency) && !isNew;

	const defaultValues = useMemo<FormValues>(
		() => ({
			id: currency?.id ?? "new",
			name: currency?.name ?? "",
			symbol: currency?.symbol ?? null,
			ISOdigits: currency?.ISOdigits ?? null,
			ISOnum: currency?.ISOnum ?? null,
			decimals: currency?.decimals ?? null,
			demonym: currency?.demonym ?? "",
			majorPlural: currency?.majorPlural ?? null,
			majorSingle: currency?.majorSingle ?? null,
			minorPlural: currency?.minorPlural ?? null,
			minorSingle: currency?.minorSingle ?? null,
			numToBasic: currency?.numToBasic ?? null,
			symbolNative: currency?.symbolNative ?? "",
		}),
		[currency],
	);

	const form = useForm<FormValues>({
		resolver: zodResolver(updateCurrencySchema) as Resolver<FormValues>,
		defaultValues,
		mode: "onChange",
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
		(result: CurrencyColumn) => {
			if (isEditMode) {
				onUpdated?.(result);
			} else {
				onCreated?.(result);
			}

			toastSuccess({
				title: isEditMode ? "Currency updated" : "Currency created",
				description: "",
			});

			form.reset(defaultValues);
			handleOpenChange(false);
		},
		[defaultValues, form, handleOpenChange, isEditMode, onCreated, onUpdated],
	);

	const onSubmit = async (values: FormValues) => {
		try {
			setLoading(true);

			if (isEditMode) {
				const result = await updateCurrencyAction(values);

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data) {
					const currencyData: CurrencyColumn = {
						id: result.data.id,
						name: result.data.name,
						symbol: result.data.symbol,
						symbolNative: result.data.symbolNative,
						demonym: result.data.demonym,
						ISOdigits: result.data.ISOdigits,
						ISOnum: result.data.ISOnum,
						decimals: result.data.decimals,
						majorPlural: result.data.majorPlural,
						majorSingle: result.data.majorSingle,
						minorPlural: result.data.minorPlural,
						minorSingle: result.data.minorSingle,
						numToBasic: result.data.numToBasic,
					};
					handleSuccess(currencyData);
				}
			} else {
				const result = await createCurrencyAction(values);

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data) {
					const currencyData: CurrencyColumn = {
						id: result.data.id,
						name: result.data.name,
						symbol: result.data.symbol,
						symbolNative: result.data.symbolNative,
						demonym: result.data.demonym,
						ISOdigits: result.data.ISOdigits,
						ISOnum: result.data.ISOnum,
						decimals: result.data.decimals,
						majorPlural: result.data.majorPlural,
						majorSingle: result.data.majorSingle,
						minorPlural: result.data.minorPlural,
						minorSingle: result.data.minorSingle,
						numToBasic: result.data.numToBasic,
					};
					handleSuccess(currencyData);
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

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			{trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
			<DialogContent className="max-w-[calc(100%-1rem)] p-4 sm:p-6 sm:max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEditMode ? "Edit Currency" : "Create Currency"}
					</DialogTitle>
					<DialogDescription>
						{isEditMode
							? "Update currency information."
							: "Add a new currency to the system."}
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<FormField
								control={form.control}
								name="id"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											ID <span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												{...field}
												disabled={
													loading || form.formState.isSubmitting || isEditMode
												}
												placeholder="e.g., USD"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											Name <span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												{...field}
												disabled={loading || form.formState.isSubmitting}
												placeholder="e.g., US Dollar"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="symbol"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Symbol</FormLabel>
										<FormControl>
											<Input
												{...field}
												value={field.value || ""}
												disabled={loading || form.formState.isSubmitting}
												placeholder="e.g., $"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="symbolNative"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											Native Symbol <span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												{...field}
												disabled={loading || form.formState.isSubmitting}
												placeholder="e.g., $"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="demonym"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											Demonym <span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												{...field}
												disabled={loading || form.formState.isSubmitting}
												placeholder="e.g., American"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="ISOnum"
								render={({ field }) => (
									<FormItem>
										<FormLabel>ISO Number</FormLabel>
										<FormControl>
											<Input
												type="number"
												{...field}
												value={field.value || ""}
												onChange={(e) =>
													field.onChange(
														e.target.value === ""
															? null
															: Number(e.target.value),
													)
												}
												disabled={loading || form.formState.isSubmitting}
												placeholder="e.g., 840"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="ISOdigits"
								render={({ field }) => (
									<FormItem>
										<FormLabel>ISO Digits</FormLabel>
										<FormControl>
											<Input
												type="number"
												{...field}
												value={field.value || ""}
												onChange={(e) =>
													field.onChange(
														e.target.value === ""
															? null
															: Number(e.target.value),
													)
												}
												disabled={loading || form.formState.isSubmitting}
												placeholder="e.g., 2"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="decimals"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Decimals</FormLabel>
										<FormControl>
											<Input
												type="number"
												{...field}
												value={field.value || ""}
												onChange={(e) =>
													field.onChange(
														e.target.value === ""
															? null
															: Number(e.target.value),
													)
												}
												disabled={loading || form.formState.isSubmitting}
												placeholder="e.g., 2"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="numToBasic"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Number to Basic</FormLabel>
										<FormControl>
											<Input
												type="number"
												{...field}
												value={field.value || ""}
												onChange={(e) =>
													field.onChange(
														e.target.value === ""
															? null
															: Number(e.target.value),
													)
												}
												disabled={loading || form.formState.isSubmitting}
												placeholder="e.g., 100"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="majorSingle"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Major Single</FormLabel>
										<FormControl>
											<Input
												{...field}
												value={field.value || ""}
												disabled={loading || form.formState.isSubmitting}
												placeholder="e.g., dollar"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="majorPlural"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Major Plural</FormLabel>
										<FormControl>
											<Input
												{...field}
												value={field.value || ""}
												disabled={loading || form.formState.isSubmitting}
												placeholder="e.g., dollars"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="minorSingle"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Minor Single</FormLabel>
										<FormControl>
											<Input
												{...field}
												value={field.value || ""}
												disabled={loading || form.formState.isSubmitting}
												placeholder="e.g., cent"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="minorPlural"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Minor Plural</FormLabel>
										<FormControl>
											<Input
												{...field}
												value={field.value || ""}
												disabled={loading || form.formState.isSubmitting}
												placeholder="e.g., cents"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => handleOpenChange(false)}
								disabled={loading || form.formState.isSubmitting}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={loading || form.formState.isSubmitting}
							>
								{isEditMode ? "Update" : "Create"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
