"use client";

import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Textarea } from "@/components/ui/textarea";
import type { StoreAnnouncement } from "@prisma/client";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import * as z from "zod";
const formSchema = z.object({
	message: z.string().min(1, { message: "message is required" }),
});

type formValues = z.infer<typeof formSchema>;

interface editProps {
	initialData: StoreAnnouncement | null;
	action: string;
}
export const MessageEdit = ({ initialData, action }: editProps) => {
	const params = useParams();
	const router = useRouter();

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	//const [open, setOpen] = useState(false);
	//const origin = useOrigin();
	const [loading, setLoading] = useState(false);

	const defaultValues = initialData
		? {
				...initialData,
			}
		: {
				message: "",
			};

	//console.log(`product basic: ${JSON.stringify(defaultValues)}`);
	const form = useForm<formValues>({
		resolver: zodResolver(formSchema),
		defaultValues,
		mode: "onChange",
	});

	const {
		register,
		formState: { errors },
		handleSubmit,
		clearErrors,
	} = useForm<formValues>();

	const onSubmit = async (data: formValues) => {
		//try {
		setLoading(true);
		//console.log(`onSubmit: ${JSON.stringify(data)}`);
		if (initialData) {
			// do edit
			await axios.patch(
				`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/announcement/${initialData.id}`,
				data,
			);
			toastSuccess({
				title: t("Announcement_updated"),
				description: "",
			});
		} else {
			// do create
			await axios.post(
				`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/announcement`,
				data,
			);
			toastSuccess({
				title: t("Announcement_created"),
				description: "",
			});
		}

		router.refresh();
		router.push(`/storeAdmin/${params.storeId}/announcements`);
		/*} catch (err: unknown) {
      const error = err as AxiosError;
      toastError({
        title: "Something went wrong.",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
      */
		setLoading(false);
	};

	const pageTitle = t(action) + t("Announcement");

	return (
		<>
			<Card>
				<CardHeader>{pageTitle}</CardHeader>
				<CardContent>
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="w-full space-y-1"
						>
							<FormField
								control={form.control}
								name="message"
								render={({ field }) => (
									<FormItem className="p-3">
										<FormControl>
											<Textarea
												disabled={loading || form.formState.isSubmitting}
												className="font-mono min-h-50"
												placeholder="message"
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
								disabled={loading || form.formState.isSubmitting}
								onClick={() => {
									clearErrors();
									router.push(`/storeAdmin/${params.storeId}/announcements`);
								}}
								className="ml-5"
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
