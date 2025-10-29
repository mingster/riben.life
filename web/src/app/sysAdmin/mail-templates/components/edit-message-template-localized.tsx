"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useWindowSize } from "usehooks-ts";
import type { z } from "zod/v4";
import { useTranslation } from "@/app/i18n/client";
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

const EditorComp = dynamic(
	() => import("@/components/editor/EditorComponent"),
	{ ssr: false },
);

import { IconEdit, IconPlus } from "@tabler/icons-react";
import dynamic from "next/dynamic";
import { updateMessageTemplateLocalizedAction } from "@/actions/sysAdmin/messageTemplateLocalized/update-message-template-localized";
import { updateMessageTemplateLocalizedSchema } from "@/actions/sysAdmin/messageTemplateLocalized/update-message-template-localized.validation";
import { toastError, toastSuccess } from "@/components/toaster";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/providers/i18n-provider";
import type { Locale, MessageTemplateLocalized } from "@/types";

interface props {
	item: z.infer<typeof updateMessageTemplateLocalizedSchema>;
	locales: Locale[];
	onUpdated?: (newValue: MessageTemplateLocalized) => void;
	isNew?: boolean;
}

export const EditMessageTemplateLocalized: React.FC<props> = ({
	item,
	locales,
	onUpdated,
	isNew,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	//const router = useRouter();

	const { lng } = useI18n();
	//console.log('lng', lng);
	const { t } = useTranslation(lng);
	const windowSize = useWindowSize();
	const isMobile = windowSize.width < 768;

	//if localId is given, set it to the default value
	const defaultLocaleId = item?.localeId || "";

	const defaultValues = item
		? {
				...item,
			}
		: {
				id: "new",
				name: "new",
				localeId: defaultLocaleId,
			};

	const form = useForm<z.infer<typeof updateMessageTemplateLocalizedSchema>>({
		resolver: zodResolver(updateMessageTemplateLocalizedSchema),
		defaultValues,
		mode: "onChange",
	});

	const {
		register,
		formState: { errors },
		handleSubmit,
		clearErrors,
	} = form;

	//console.log("disabled", loading || form.formState.isSubmitting);

	async function onSubmit(
		data: z.infer<typeof updateMessageTemplateLocalizedSchema>,
	) {
		console.log("data", data);
		setLoading(true);
		const result = (await updateMessageTemplateLocalizedAction(
			data,
		)) as MessageTemplateLocalized;
		if (result?.serverError) {
			toastError({ description: result.serverError });
		} else {
			// also update data from parent component or caller
			onUpdated?.(result.data);

			if (isNew) {
				//if (data.id === "new") {
				data.id = result.data.id;
				toastSuccess({ description: "Message template localized created." });
			} else {
				toastSuccess({ description: "Message template localized updated." });
			}
		}
		setLoading(false);
		setIsOpen(false);
	}

	return (
		<>
			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogTrigger asChild>
					<Button
						variant={"ghost"}
						onClick={() => {
							setIsOpen(true);
						}}
					>
						{isNew ? (
							<IconPlus className="mr-0 size-3" />
						) : (
							<IconEdit className="mr-0 size-3" />
						)}
					</Button>
				</DialogTrigger>

				<DialogContent className="p-2 space-y-2 sm:max-w-[90%]">
					<DialogHeader className="">
						<DialogTitle>Message template localized</DialogTitle>
						<DialogDescription></DialogDescription>
					</DialogHeader>

					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="space-y-2.5"
						>
							<FormField
								control={form.control}
								name="localeId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Locale</FormLabel>
										<FormControl>
											<Select
												value={field.value || ""}
												onValueChange={field.onChange}
												disabled={loading || form.formState.isSubmitting}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select a locale" />
												</SelectTrigger>
												<SelectContent>
													{locales.map((locale) => (
														<SelectItem key={locale.lng} value={locale.lng}>
															{locale.name} ({locale.lng})
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="subject"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Subject</FormLabel>
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												placeholder="Enter the subject of this message template localized"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="body"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Body</FormLabel>
										<FormControl>
											<EditorComp
												markdown={field.value || ""}
												onPChange={field.onChange}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="bCCEmailAddresses"
								render={({ field }) => (
									<FormItem className="w-full">
										<FormLabel>BCC Email Addresses</FormLabel>
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												placeholder="Enter BCC email addresses"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="isActive"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between p-3 rounded-lg shadow-sm">
										<div className="space-y-0.5">
											<FormLabel>Active</FormLabel>
										</div>
										<FormControl>
											<Switch
												checked={field.value || false}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
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
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									clearErrors();
									setIsOpen(false);
									//router.push(`/${params.storeId}/support`);
								}}
								className="ml-2"
							>
								{t("Cancel")}
							</Button>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		</>
	);
};
