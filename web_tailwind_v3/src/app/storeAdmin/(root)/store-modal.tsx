"use client";

import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useTranslation } from "@/app/i18n/client";
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
import { Modal } from "@/components/ui/modal";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/providers/i18n-provider";

import { CountryCombobox } from "@/components/country-combobox";
import { CurrencyCombobox } from "@/components/currency-combobox";
import { LocaleSelectItems } from "@/components/locale-select-items";
import { Button } from "@/components/ui/button";
import { useStoreModal } from "@/hooks/storeAdmin/use-store-modal";
import { useParams } from "next/navigation";
import { z } from "zod";
import { createStore } from "./actions";

//NOTE - do not move this to other folder.
//TODO - import from template
export const formSchema = z.object({
	name: z.string().min(1),
	defaultLocale: z.string().min(1),
	defaultCountry: z.string().min(1),
	defaultCurrency: z.string().min(1),
});

export const StoreModal: React.FC = () => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");
	const storeModal = useStoreModal();
	const [loading, setLoading] = useState(false);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			defaultCountry: "TWN",
			defaultCurrency: "TWD",
			defaultLocale: "tw",
		},
	});

	const { toast } = useToast();

	const onSubmit = async (values: z.infer<typeof formSchema>) => {
		setLoading(true);
		//console.log('values: ' + JSON.stringify(values));

		const databaseId = await createStore(values);

		toast({
			title: t("Store_Created"),
			description: "",
			variant: "success",
		});

		// close this modal
		storeModal.onClose();
		window.location.assign(`/storeAdmin/${databaseId}/settings`);
		//redirect(`/storeAdmin/${databaseId}/settings`);

		/*
        //try {
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }*/
		setLoading(false);
	};

	return (
		<Modal
			title={t("Store_Create")}
			description=""
			isOpen={storeModal.isOpen}
			onClose={storeModal.onClose}
		>
			<div>
				<div className="space-y-4 py-2 pb-4">
					<div className="space-y-2">
						<Form {...form}>
							<form onSubmit={form.handleSubmit(onSubmit)}>
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("StoreSettings_Store_Name")}</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													placeholder={t("StoreSettings_Store_Name_Descr")}
													{...field}
												/>
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
											<FormLabel>{t("StoreSettings_Store_Locale")}</FormLabel>
											<Select
												disabled={loading || form.formState.isSubmitting}
												onValueChange={field.onChange}
												defaultValue={field.value}
											>
												<SelectTrigger>
													<SelectValue
														placeholder={t("StoreSettings_Store_Locale_Descr")}
													/>
												</SelectTrigger>

												<SelectContent>
													<LocaleSelectItems />
												</SelectContent>
											</Select>
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="defaultCurrency"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("StoreSettings_Store_Currency")}</FormLabel>
											<CurrencyCombobox
												disabled={loading || form.formState.isSubmitting}
												onValueChange={field.onChange}
												defaultValue={field.value}
											/>
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="defaultCountry"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("StoreSettings_Store_Country")}</FormLabel>
											<CountryCombobox
												disabled={loading || form.formState.isSubmitting}
												onValueChange={field.onChange}
												defaultValue={field.value}
											/>
										</FormItem>
									)}
								/>

								<div className="flex w-full items-center justify-end space-x-2 pt-6">
									<Button
										disabled={
											loading ||
											!form.formState.isValid ||
											form.formState.isSubmitting
										}
										variant="outline"
										onClick={storeModal.onClose}
									>
										{t("Cancel")}
									</Button>
									<Button
										disabled={loading || form.formState.isSubmitting}
										type="submit"
									>
										{t("Continue")}
									</Button>
								</div>
							</form>
						</Form>
					</div>
				</div>
			</div>
		</Modal>
	);
};
