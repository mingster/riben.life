"use client";
import { toastError, toastSuccess } from "@/components/toaster";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { type AxiosError } from "axios";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
} from "@/components/ui/form";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { SettingsFormProps } from "./setting-basic-tab";
import { updateStoreRsvpAction } from "@/actions/storeAdmin/settings/update-store-rsvp";
import type { UpdateStoreRsvpInput } from "@/actions/storeAdmin/settings/update-store-rsvp.validation";
import type { Store } from "@/types";

const formSchema = z.object({
	acceptReservation: z.boolean().default(true),
});

type formValues = z.infer<typeof formSchema>;

export const RsvpSettingTab: React.FC<SettingsFormProps> = ({
	store,
	storeSettings,
	onStoreUpdated,
}) => {
	const params = useParams();
	const router = useRouter();

	//const origin = useOrigin();
	const [loading, setLoading] = useState(false);
	//const [openAddNew, setOpenAddNew] = useState(false);

	const defaultValues = store
		? {
				...store,
			}
		: {};

	//console.log('defaultValues: ' + JSON.stringify(defaultValues));
	const form = useForm<formValues>({
		resolver: zodResolver(formSchema) as any,
		defaultValues,
	});

	/*
  const [isSubmittable, setIsSubmittable] = useState(
	!!form.formState.isDirty && !!form.formState.isValid,
  );
  useEffect(() => {
	setIsSubmittable(!!form.formState.isDirty && !!form.formState.isValid);
  }, [form.formState]);
  logger.info("Operation log");

  const useBusinessHours = form.watch("useBusinessHours");
  logger.info("Operation log");
  //form.setValue("isOpen", !useBusinessHours);
  */
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");
	//console.log(`form error: ${JSON.stringify(form.formState.errors)}`);
	const onSubmit = async (data: formValues) => {
		try {
			setLoading(true);

			const payload: UpdateStoreRsvpInput = {
				storeId: params.storeId as string,
				acceptReservation: data.acceptReservation,
			};

			const result = await updateStoreRsvpAction(payload);

			if (result?.serverError) {
				toastError({ title: t("Error"), description: result.serverError });
			} else if (result?.data) {
				onStoreUpdated?.(result.data.store as Store);

				toastSuccess({
					title: t("Store_Updated"),
					description: "",
				});
			}
		} catch (error: unknown) {
			const err = error as AxiosError;
			toastError({
				title: "Something went wrong.",
				description: err.message,
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<Card>
				<CardContent className="">
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="w-full space-y-1"
						>
							<div className="grid grid-flow-row-dense grid-cols-2 gap-1">
								{" "}
								&nbsp;{" "}
							</div>

							<FormField
								control={form.control}
								name="acceptReservation"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
										<div className="space-y-0.5">
											<FormLabel>
												{t("StoreSettings_acceptReservation")}
											</FormLabel>
											<FormDescription>
												{t("StoreSettings_acceptReservation_descr")}
											</FormDescription>
										</div>
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
									</FormItem>
								)}
							/>

							<Button
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
								className="disabled:opacity-25"
								type="submit"
							>
								{t("Save")}
							</Button>

							<Button
								type="button"
								variant="outline"
								onClick={() => {
									form.clearErrors();
									router.push("../");
								}}
								disabled={loading || form.formState.isSubmitting}
								className="ml-2 disabled:opacity-25"
							>
								{t("Cancel")}
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>
		</>
	);
};
