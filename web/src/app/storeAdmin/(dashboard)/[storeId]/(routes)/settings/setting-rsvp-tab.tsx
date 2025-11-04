"use client";
import { toastError, toastSuccess } from "@/components/toaster";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { type AxiosError } from "axios";
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

const formSchema = z.object({
	acceptReservation: z.boolean().default(true),
});

type formValues = z.infer<typeof formSchema>;

export const RsvpSettingTab: React.FC<SettingsFormProps> = ({
	store,
	storeSettings,
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

	const {
		register,
		formState: { errors },
		handleSubmit,
		watch,
		clearErrors,
	} = useForm<formValues>();

	/*
  const [isSubmittable, setIsSubmittable] = useState(
	!!form.formState.isDirty && !!form.formState.isValid,
  );
  useEffect(() => {
	setIsSubmittable(!!form.formState.isDirty && !!form.formState.isValid);
  }, [form.formState]);
  console.log(`isSubmittable:${isSubmittable}`);

  const useBusinessHours = form.watch("useBusinessHours");
  console.log(`useBusinessHours: ${useBusinessHours}`);
  //form.setValue("isOpen", !useBusinessHours);
  */
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");
	//console.log(`form error: ${JSON.stringify(form.formState.errors)}`);
	const onSubmit = async (data: formValues) => {
		//console.log('onSubmit: ' + JSON.stringify(data));
		try {
			setLoading(true);
			//console.log('onSubmit: ' + JSON.stringify(data));

			await axios.patch(
				`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/settings/rsvp`,
				data,
			);

			router.refresh();

			//revalidatePath('/[storeId]', 'page');

			toastSuccess({
				title: t("Store_Updated"),
				description: "",
			});
		} catch (error: unknown) {
			const err = error as AxiosError;
			toastError({
				title: "Something went wrong.",
				description: err.message,
			});
		} finally {
			setLoading(false);
			//setIsSubmittable(false);
			//console.log(data);
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
									clearErrors();
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
