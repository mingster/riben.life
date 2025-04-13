"use client";
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";

import { Card, CardContent } from "@/components/ui/card";
import axios, { type AxiosError } from "axios";
import { XCircleIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import {
	Select,
	SelectContent,
	SelectTrigger,
	SelectValue,
} from "@radix-ui/react-select";

import type {
	Category,
	Product,
	Store,
	StoreAnnouncement,
	StoreOrder,
	Subscription,
	User,
} from "@prisma/client";

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

import { CountryCombobox } from "@/components/country-combobox";
import { CurrencyCombobox } from "@/components/currency-combobox";
import ImageUploadBox from "@/components/image-upload-box";
import { LocaleSelectItems } from "@/components/locale-select-items";
import { deleteImage, uploadImage } from "@/lib/utils";
import { StoreLevel } from "@/types/enum";
import Link from "next/link";

const formSchema = z.object({
	level: z.coerce.number(),
});

type formValues = z.infer<typeof formSchema>;

export interface SettingsFormProps {
	initialData: Store;
	subscription: Subscription;
}

export const StoreSubscrptionTab: React.FC<SettingsFormProps> = ({
	initialData,
}) => {
	const params = useParams();
	const router = useRouter();
	const { toast } = useToast();

	//const origin = useOrigin();
	const [loading, setLoading] = useState(false);

	const defaultValues = initialData
		? {
				...initialData,
			}
		: {};
	//console.log('defaultValues: ' + JSON.stringify(defaultValues));
	const form = useForm<formValues>({
		resolver: zodResolver(formSchema),
		defaultValues,
	});

	const {
		register,
		formState: { errors },
		handleSubmit,
		clearErrors,
	} = useForm<formValues>();

	//const isSubmittable = !!form.formState.isDirty && !!form.formState.isValid;

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const onSubmit = async (data: formValues) => {};

	if (!initialData) return;

	return (
		<>
			<Card>
				<CardContent className="space-y-2">
					current subscription level:
					<Button variant="outline" size="sm">
						<Link
							href={`/storeAdmin/${initialData.id}/subscribe`}
							className="text-xs"
						>
							{initialData.level === StoreLevel.Free
								? t("storeAdmin_switchLevel_free")
								: initialData.level === StoreLevel.Pro
									? t("storeAdmin_switchLevel_pro")
									: t("storeAdmin_switchLevel_multi")}
						</Link>
					</Button>
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="w-full space-y-1"
						>
							<FormField
								control={form.control}
								name="level"
								render={({ field }) => (
									<FormItem>
										<FormLabel>change to</FormLabel>
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												className="font-mono"
												placeholder={t("Store_Name_Descr")}
												{...field}
											/>
										</FormControl>
										<FormMessage />
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
