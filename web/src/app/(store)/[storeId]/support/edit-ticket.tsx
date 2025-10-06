"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconMessageFilled, IconPlus } from "@tabler/icons-react";
import axios, { type AxiosError } from "axios";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useWindowSize } from "usehooks-ts";


import { updateTicketAction } from "@/actions/store/support-ticket/update-ticket";
import { updateTicketSchema, type UpdateTicketInput } from "@/actions/store/support-ticket/update-ticket.validation";
import { useTranslation } from "@/app/i18n/client";
import { toastError, toastSuccess } from "@/components/Toaster";
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
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/providers/i18n-provider";
import type { SupportTicket, User } from "@/types";
import { TicketStatus } from "@/types/enum";

interface props {
	item: SupportTicket | null;
	isNew?: boolean;
	currentUser: User;
	onUpdated?: (newValue: SupportTicket) => void;
}

// always create a new ticket.
// if item exists, use it as threadId
//
export const EditTicket: React.FC<props> = ({
	item,
	onUpdated,
	isNew,
	currentUser,
}) => {
	const [isEditorOpen, setIsEditorOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const params = useParams(); // get storeId from url

	const { lng } = useI18n();
	//console.log('lng', lng);
	const { t } = useTranslation(lng);
	const windowSize = useWindowSize();
	const isMobile = windowSize.width < 768;

	const defaultValues = !isNew
		? {
			// for reply - create a new reply ticket and use previous ticket's info
			id: "",
			senderId: currentUser.id,
			creator: currentUser.Email,
			modifier: currentUser.Email,
			department: item.department,
			subject: item.subject,
			status: item.status,
			// if item has threadId, use it. If not, this item will be the main thread - use its id.
			threadId: item.threadId || item.id,
			storeId: params.storeId as string,
		}
		: {
			// create a new root ticket
			id: "",
			senderId: currentUser.id,
			creator: currentUser.Email,
			modifier: currentUser.Email,
			status: Number(TicketStatus.Open),
			department: "technical",
			storeId: params.storeId as string,
		};

	//console.log("defaultValues", isNew, defaultValues);

	const form = useForm<UpdateTicketInput>({
		resolver: zodResolver(updateTicketSchema),
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

	// commit to db and return the updated category
	async function onSubmit(data: UpdateTicketInput) {
		setLoading(true);

		//console.log("data", data);

		const result = (await updateTicketAction(data)) as SupportTicket;
		if (result?.serverError) {
			toastError({ description: result.serverError });
		} else {
			// also update data from parent component or caller
			const updatedData = result.data;
			//console.log("onSubmit", updatedData);

			onUpdated?.(updatedData); // update the parent component

			if (updatedData) {
				// send email to store owner
				try {
					// add to mail-queue
					// don't use updatedData, it's for UI display
					const result = await axios.post(
						`${process.env.NEXT_PUBLIC_API_URL}/store/${params.storeId}/support-ticket/send`,
						updatedData,
					);

					/*
					if (result.status === 200 && result.data.success) {
						toast("我們已經收到你的訊息，會盡快回覆你。");
					} else {
						toast("Ahh, something went wrong. Please try again.");

						console.log(JSON.stringify(result));
					}*/

					toastSuccess({ description: t("ticket_create_success") });
				} catch (error: unknown) {
					const err = error as AxiosError;
					toastError({ description: err.message });
				} finally {
					setLoading(false);
				}
			}
		}
		setLoading(false);
		setIsEditorOpen(false);
	}

	return (
		<Drawer
			direction={isMobile ? "bottom" : "right"}
			open={isEditorOpen}
			onOpenChange={setIsEditorOpen}
		>
			<DrawerTrigger asChild>
				{isNew ? (
					<Button
						variant={"outline"}
						onClick={() => {
							setIsEditorOpen(true);
						}}
					>
						<IconPlus className="mr-0 text-green-500" size={10} />
						{t("ticket_new")}
					</Button>
				) : (
					<Button
						title={t("ticket_reply")}
						variant={"ghost"}
						onClick={() => setIsEditorOpen(true)}
					>
						<IconMessageFilled size={8} />
					</Button>
				)}
			</DrawerTrigger>

			<DrawerContent className="p-2 space-y-2 w-full">
				<DrawerHeader className="">
					<DrawerTitle>{t("ticket_title")}</DrawerTitle>
					<DrawerDescription>
						{isNew ? t("ticket_new") : t("ticket_reply")}
					</DrawerDescription>
				</DrawerHeader>

				{/* display all form error if any */}

				{Object.keys(form.formState.errors).length > 0 && (
					<div className="text-destructive space-y-2">
						{Object.entries(form.formState.errors).map(([field, error]) => (
							<div key={field} className="flex items-center gap-2">
								<span className="font-medium">{field}:</span>
								<span>{error.message as string}</span>
							</div>
						))}
					</div>
				)}

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2.5">
						<FormField
							control={form.control}
							name="department"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("ticket_department")}</FormLabel>
									<FormControl>
										<Select
											disabled={
												loading || form.formState.isSubmitting || !isNew
											}
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<SelectTrigger>
												<SelectValue placeholder="Enter the department of the ticket" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="billing">Billing</SelectItem>
												<SelectItem value="technical">Technical</SelectItem>
												<SelectItem value="sales">Sales</SelectItem>
												<SelectItem value="other">Other</SelectItem>
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
								<FormItem className="w-full">
									<FormLabel>{t("ticket_subject")}</FormLabel>
									<FormControl>
										<Input
											disabled={loading || form.formState.isSubmitting}
											placeholder="Enter subject of this ticket"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="message"
							render={({ field }) => (
								<FormItem className="w-full">
									<FormLabel>{t("ticket_message")}</FormLabel>
									<FormControl>
										<Textarea
											rows={7}
											disabled={loading || form.formState.isSubmitting}
											className="placeholder:text-gray-700 rounded-lg outline-none font-mono min-h-50"
											placeholder="Enter the message of the ticket"
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
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								clearErrors();
								setIsEditorOpen(false);
								//router.push(`/${params.storeId}/support`);
							}}
							className="ml-2"
						>
							{t("Cancel")}
						</Button>
					</form>
				</Form>
			</DrawerContent>
		</Drawer>
	);
};
