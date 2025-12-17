"use client";

import { updateMessageTemplateAction } from "@/actions/storeAdmin/notification/update-message-template";
import { updateMessageTemplateSchema } from "@/actions/storeAdmin/notification/update-message-template.validation";
import { useTranslation } from "@/app/i18n/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconEdit, IconLoader, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useWindowSize } from "usehooks-ts";
import type { z } from "zod/v4";

import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
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
import { useI18n } from "@/providers/i18n-provider";
import type { MessageTemplate } from "@/types";
import type { MessageTemplateLocalized } from "@prisma/client";

interface props {
	item: MessageTemplate;
	onUpdated?: (newValue: MessageTemplate) => void;
	storeId: string;
}

export const EditMessageTemplate: React.FC<props> = ({
	item,
	onUpdated,
	storeId,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const windowSize = useWindowSize();
	const isMobile = windowSize.width < 768;

	const defaultValues = item
		? {
				...item,
				templateType: item.templateType || "email",
			}
		: {
				id: "new",
				name: "new",
				templateType: "email" as const,
			};

	const form = useForm<z.infer<typeof updateMessageTemplateSchema>>({
		resolver: zodResolver(updateMessageTemplateSchema) as any,
		defaultValues,
		mode: "onChange",
	});

	const {
		register,
		formState: { errors },
		handleSubmit,
		clearErrors,
	} = form;

	// commit to db and return the updated category
	async function onSubmit(data: z.infer<typeof updateMessageTemplateSchema>) {
		setLoading(true);

		const result = await updateMessageTemplateAction(storeId, data);
		if (!result) {
			toastError({ description: "An error occurred" });
		} else if (result.serverError) {
			toastError({ description: result.serverError });
		} else if (result.data) {
			// also update data from parent component or caller
			const resultData = result.data as MessageTemplate & {
				MessageTemplateLocalized?: MessageTemplateLocalized[];
			};
			const updatedData = {
				id: resultData.id,
				name: resultData.name,
				MessageTemplateLocalized: resultData.MessageTemplateLocalized || [],
			} as MessageTemplate;

			onUpdated?.(updatedData);

			const isGlobalTemplate = item?.isGlobal === true;
			const isNewTemplate = item?.id === "new" || !item?.id;

			if (isNewTemplate) {
				toastSuccess({ description: "Message template created." });
			} else if (isGlobalTemplate) {
				toastSuccess({
					description: "Global template copied and saved as store template.",
				});
			} else {
				toastSuccess({ description: "Message template updated." });
			}
		}
		setLoading(false);
		setIsOpen(false);
	}

	return (
		<>
			<Drawer
				direction={isMobile ? "bottom" : "right"}
				open={isOpen}
				onOpenChange={setIsOpen}
			>
				<DrawerTrigger asChild>
					{item === null || item.id === "new" ? (
						<Button
							variant={"outline"}
							onClick={() => {
								setIsOpen(true);
							}}
						>
							<IconPlus className="mr-0 size-4" />
							{t("create")}
						</Button>
					) : (
						<Button
							variant="link"
							className="text-foreground w-fit px-0 text-left"
							onClick={() => setIsOpen(true)}
						>
							<IconEdit className="mr-0 size-3" />
						</Button>
					)}
				</DrawerTrigger>

				<DrawerContent className="p-2 space-y-2 w-full">
					<DrawerHeader className="">
						<DrawerTitle>{t("message_template")}</DrawerTitle>
						<DrawerDescription>
							{
								//display form error if any
							}
						</DrawerDescription>
					</DrawerHeader>

					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="space-y-2.5"
						>
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem className="w-full">
										<FormLabel>
											{t("name")} <span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												placeholder={t("enter_template_name")}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="templateType"
								render={({ field }) => (
									<FormItem className="w-full">
										<FormLabel>
											{t("template_type")}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Select
												disabled={loading || form.formState.isSubmitting}
												value={field.value}
												onValueChange={field.onChange}
											>
												<SelectTrigger>
													<SelectValue
														placeholder={t("select_template_type")}
													/>
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="email">Email</SelectItem>
													<SelectItem value="line">LINE</SelectItem>
													<SelectItem value="sms">SMS</SelectItem>
													<SelectItem value="whatsapp">WhatsApp</SelectItem>
													<SelectItem value="wechat">WeChat</SelectItem>
													<SelectItem value="telegram">Telegram</SelectItem>
													<SelectItem value="push">
														Push Notification
													</SelectItem>
													<SelectItem value="onsite">On-Site</SelectItem>
												</SelectContent>
											</Select>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							{/* Note: isGlobal is always false for store templates, storeId is set automatically */}
							<div className="text-sm text-muted-foreground">
								{t("store_template_note")}
							</div>

							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => {
										setIsOpen(false);
										clearErrors();
									}}
									disabled={loading || form.formState.isSubmitting}
								>
									{t("cancel")}
								</Button>
								<Button
									type="submit"
									disabled={loading || form.formState.isSubmitting}
								>
									{loading || form.formState.isSubmitting ? (
										<>
											<IconLoader className="mr-2 h-4 w-4 animate-spin" />
											{t("saving")}
										</>
									) : (
										t("save")
									)}
								</Button>
							</div>
						</form>
					</Form>
				</DrawerContent>
			</Drawer>
		</>
	);
};
