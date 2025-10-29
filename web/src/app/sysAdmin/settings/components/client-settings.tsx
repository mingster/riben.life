"use client";

import { updatePlatformSettingsAction } from "@/actions/sysAdmin/platformSettings/update-platform-settings";
import { updatePlatformSettingsSchema } from "@/actions/sysAdmin/platformSettings/update-platform-settings.validation";
import { useTranslation } from "@/app/i18n/client";
import { toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/providers/i18n-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import type { PlatformSettings } from "@prisma/client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type Stripe from "stripe";
import type { z } from "zod/v4";

// update platform settings.
//
export const ClientSettings = ({
	platformSettings,
	prices,
}: {
	platformSettings: PlatformSettings;
	prices: Stripe.Price[];
}) => {
	const [loading, setLoading] = useState(false);
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	type formValues = z.infer<typeof updatePlatformSettingsSchema>;

	const defaultValues = platformSettings
		? {
				id: platformSettings.id,
				stripeProductId: platformSettings.stripeProductId || "",
				stripePriceId: platformSettings.stripePriceId || "",
				settings: platformSettings.settings || "",
			}
		: {
				id: "new",
				stripeProductId: "new",
				stripePriceId: "new",
				settings: "{}",
			};

	const form = useForm<formValues>({
		resolver: zodResolver(updatePlatformSettingsSchema),
		defaultValues,
	});

	const {
		register,
		formState: { errors, isDirty, isValid },
		handleSubmit,
		clearErrors,
	} = form;

	const isSubmittable = !!isDirty && !!isValid;
	//console.log("isSubmittable", isSubmittable, isValid, isDirty);

	// commit to db and return the updated category
	async function onSubmit(data: formValues) {
		console.log("onSubmit", data);
		setLoading(true);

		// stringify kv array
		//const kvString = JSON.stringify(kv);
		//data.settings = kvString;

		await updatePlatformSettingsAction(data);
		setLoading(false);

		toastSuccess({
			title: t("platformSettings.updated"),
			description: t("platformSettings.updated"),
		});
	}

	return (
		<div className="font-mono text-xs space-y-6">
			{/* show all form errors */}
			{errors && (
				<div className="text-red-500">
					{Object.values(errors).map((error) => (
						<div key={error.message}>{error.message}</div>
					))}
				</div>
			)}

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2.5">
					<FormField
						control={form.control}
						name="stripeProductId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Stripe Product ID</FormLabel>
								<FormControl>
									<Input
										disabled={loading || form.formState.isSubmitting}
										placeholder="Enter the stripe product id"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="settings"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Settings</FormLabel>
								<FormControl>
									<Textarea
										rows={7}
										disabled={loading || form.formState.isSubmitting}
										className="placeholder:text-gray-700 rounded-lg outline-none font-mono min-h-50"
										placeholder="Enter the settings"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<Button
						type="submit"
						disabled={loading || form.formState.isSubmitting}
						className="disabled:opacity-25"
					>
						{t("Submit")}
					</Button>
				</form>
			</Form>

			<div className="mt-10">
				<h1 className="text-lg font-semibold mb-4">Stripe Prices</h1>
				<div className="space-y-2">
					{prices.map((price) => (
						<div key={price.id} className="flex gap-5 border p-3 rounded-lg">
							<div className="font-medium">{price.id}</div>
							<div>${(price.unit_amount || 0) / 100}</div>
							<div>{price.recurring?.interval}</div>
							<div>{price.recurring?.interval_count}</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default ClientSettings;
