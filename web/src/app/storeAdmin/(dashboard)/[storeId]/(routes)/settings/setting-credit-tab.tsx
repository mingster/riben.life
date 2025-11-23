"use client";
import { toastError, toastSuccess } from "@/components/toaster";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

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
import { Separator } from "@/components/ui/separator";

import { updateStoreCreditAction } from "@/actions/storeAdmin/rsvpSettings/update-store-credit";
import {
	updateStoreCreditSchema,
	type UpdateStoreCreditInput,
} from "@/actions/storeAdmin/rsvpSettings/update-store-credit.validation";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { Store } from "@/types";

type FormValues = Omit<UpdateStoreCreditInput, "storeId">;

export interface CreditTabProps {
	store: Store;
	onStoreUpdated?: (store: Store) => void;
}

export const CreditTab: React.FC<CreditTabProps> = ({
	store,
	onStoreUpdated,
}) => {
	const params = useParams();

	const [loading, setLoading] = useState(false);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const defaultValues: FormValues = useMemo(
		() => ({
			useCustomerCredit: store?.useCustomerCredit ?? false,
			creditExchangeRate: store?.creditExchangeRate
				? Number(store.creditExchangeRate)
				: 0,
			creditServiceExchangeRate: store?.creditServiceExchangeRate
				? Number(store.creditServiceExchangeRate)
				: 0,
			creditMaxPurchase: store?.creditMaxPurchase
				? Number(store.creditMaxPurchase)
				: 0,
			creditMinPurchase: store?.creditMinPurchase
				? Number(store.creditMinPurchase)
				: 0,
			creditExpiration: store?.creditExpiration ?? 365,
		}),
		[store],
	);

	const form = useForm<FormValues>({
		resolver: zodResolver(
			updateStoreCreditSchema.omit({ storeId: true }),
		) as any,
		defaultValues,
		mode: "onChange",
		reValidateMode: "onChange",
	});

	// Reset form when store changes (after update)
	useEffect(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	const onSubmit = async (data: FormValues) => {
		try {
			setLoading(true);

			const payload: UpdateStoreCreditInput = {
				storeId: params.storeId as string,
				...data,
			};

			const result = await updateStoreCreditAction(payload);

			if (result?.serverError) {
				toastError({ title: t("Error"), description: result.serverError });
			} else if (result?.data) {
				// Update local state instead of refreshing router
				const updatedStore = result.data.store as Store;
				onStoreUpdated?.(updatedStore);

				toastSuccess({
					title: t("Store_Updated"),
					description: "",
				});
			}
		} catch (error: unknown) {
			toastError({
				title: t("Error"),
				description:
					error instanceof Error ? error.message : "Something went wrong.",
			});
		} finally {
			setLoading(false);
		}
	};

	const useCustomerCredit = form.watch("useCustomerCredit");

	return (
		<Card>
			<CardContent>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit, (errors) => {
							const firstErrorKey = Object.keys(errors)[0];
							if (firstErrorKey) {
								const error = errors[firstErrorKey as keyof typeof errors];
								const errorMessage = error?.message;
								if (errorMessage) {
									toastError({
										title: t("Error"),
										description: errorMessage,
									});
								}
							}
						})}
						className="space-y-6"
					>
						{/* Credit System Settings */}
						<FormField
							control={form.control}
							name="useCustomerCredit"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
									<div className="space-y-0.5">
										<FormLabel>
											{t("StoreSettings_Use_Customer_Credit")}
										</FormLabel>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("StoreSettings_Use_Customer_Credit_Descr")}
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

						{useCustomerCredit && (
							<>
								<div className="grid grid-flow-row-dense grid-cols-2 gap-1">
									<FormField
										control={form.control}
										name="creditExchangeRate"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													{t("StoreSettings_Credit_Exchange_Rate")}
												</FormLabel>
												<FormControl>
													<Input
														type="number"
														step="0.01"
														disabled={loading || form.formState.isSubmitting}
														value={field.value?.toString() ?? "0"}
														onChange={(event) =>
															field.onChange(Number(event.target.value))
														}
													/>
												</FormControl>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("StoreSettings_Credit_Exchange_Rate_Descr")}
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="creditServiceExchangeRate"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													{t("StoreSettings_Credit_Service_Exchange_Rate")}
												</FormLabel>
												<FormControl>
													<Input
														type="number"
														step="0.01"
														disabled={loading || form.formState.isSubmitting}
														value={field.value?.toString() ?? "0"}
														onChange={(event) =>
															field.onChange(Number(event.target.value))
														}
													/>
												</FormControl>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t(
														"StoreSettings_Credit_Service_Exchange_Rate_Descr",
													)}
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
								<div className="grid grid-flow-row-dense grid-cols-2 gap-1">
									<FormField
										control={form.control}
										name="creditMaxPurchase"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													{t("StoreSettings_Credit_Max_Purchase")}
												</FormLabel>
												<FormControl>
													<Input
														type="number"
														step="0.01"
														disabled={loading || form.formState.isSubmitting}
														value={field.value?.toString() ?? "0"}
														onChange={(event) =>
															field.onChange(Number(event.target.value))
														}
													/>
												</FormControl>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("StoreSettings_Credit_Max_Purchase_Descr")}
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="creditMinPurchase"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													{t("StoreSettings_Credit_Min_Purchase")}
												</FormLabel>
												<FormControl>
													<Input
														type="number"
														step="0.01"
														disabled={loading || form.formState.isSubmitting}
														value={field.value?.toString() ?? "0"}
														onChange={(event) =>
															field.onChange(Number(event.target.value))
														}
													/>
												</FormControl>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("StoreSettings_Credit_Min_Purchase_Descr")}
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>

								<FormField
									control={form.control}
									name="creditExpiration"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("StoreSettings_Credit_Expiration")}
											</FormLabel>
											<FormControl>
												<Input
													type="number"
													step="1"
													disabled={loading || form.formState.isSubmitting}
													value={field.value?.toString() ?? "365"}
													onChange={(event) =>
														field.onChange(Number(event.target.value))
													}
												/>
											</FormControl>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("StoreSettings_Credit_Expiration_Descr")}
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							</>
						)}

						<div className="flex space-x-2 pt-4">
							<Button
								type="submit"
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
								className="disabled:opacity-25"
							>
								{t("Save")}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => form.reset(defaultValues)}
								disabled={loading || form.formState.isSubmitting}
							>
								{t("Cancel")}
							</Button>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
};
