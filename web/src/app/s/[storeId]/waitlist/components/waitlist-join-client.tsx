"use client";

import { useState, useCallback } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import Container from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { createWaitlistEntryAction } from "@/actions/store/waitlist/create-waitlist-entry";
import {
	createWaitlistEntrySchema,
	type CreateWaitlistEntryInput,
} from "@/actions/store/waitlist/create-waitlist-entry.validation";
import { toastError, toastSuccess } from "@/components/toaster";
import Link from "next/link";

const WAITLIST_STORAGE_KEY = "riben_waitlist";
const WAITLIST_STORAGE_EXPIRY_HOURS = 24;

function getEndOfDayEpoch(): number {
	const d = new Date();
	d.setHours(23, 59, 59, 999);
	return d.getTime();
}

function saveWaitlistToStorage(entry: {
	id: string;
	storeId: string;
	queueNumber: number;
	verificationCode: string;
}) {
	try {
		const payload = {
			...entry,
			expiry: getEndOfDayEpoch(),
		};
		localStorage.setItem(WAITLIST_STORAGE_KEY, JSON.stringify(payload));
	} catch {
		// ignore
	}
}

interface WaitlistJoinClientProps {
	storeId: string;
	storeName: string;
	waitlistEnabled: boolean;
	waitlistRequireSignIn: boolean;
}

export function WaitlistJoinClient({
	storeId,
	storeName,
	waitlistEnabled,
	waitlistRequireSignIn,
}: WaitlistJoinClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [submittedEntry, setSubmittedEntry] = useState<{
		queueNumber: number;
		verificationCode: string;
		id: string;
	} | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const form = useForm<CreateWaitlistEntryInput>({
		resolver: zodResolver(
			createWaitlistEntrySchema,
		) as Resolver<CreateWaitlistEntryInput>,
		defaultValues: {
			storeId,
			customerId: null,
			name: "",
			lastName: "",
			phone: "",
			numOfAdult: 1,
			numOfChild: 0,
			message: "",
		},
		mode: "onChange",
	});

	const onSubmit = useCallback(
		async (data: CreateWaitlistEntryInput) => {
			setIsSubmitting(true);
			try {
				const result = await createWaitlistEntryAction({
					...data,
					storeId,
					name: data.name?.trim() || undefined,
					lastName: data.lastName?.trim() || undefined,
					phone: data.phone?.trim() || undefined,
					message: data.message?.trim() || undefined,
				});
				if (result?.serverError) {
					toastError({
						title: t("waitlist_join_error") || "Error",
						description: result.serverError,
					});
					return;
				}
				if (result?.data?.entry) {
					const e = result.data.entry;
					setSubmittedEntry({
						id: e.id,
						queueNumber: e.queueNumber,
						verificationCode: e.verificationCode,
					});
					saveWaitlistToStorage({
						id: e.id,
						storeId,
						queueNumber: e.queueNumber,
						verificationCode: e.verificationCode,
					});
					toastSuccess({
						description:
							(t("waitlist_joined") || "You're on the list!") +
							" " +
							(t("waitlist_show_code_to_staff") ||
								"Show your code to staff when your number is called."),
					});
				}
			} finally {
				setIsSubmitting(false);
			}
		},
		[storeId, t],
	);

	if (!waitlistEnabled) {
		return (
			<Container className="py-10">
				<Card>
					<CardHeader>
						<CardTitle>{t("waitlist_title") || "Join the waitlist"}</CardTitle>
						<CardDescription>
							{t("waitlist_not_available") ||
								"Waitlist is not available for this store."}
						</CardDescription>
					</CardHeader>
				</Card>
			</Container>
		);
	}

	if (submittedEntry) {
		return (
			<Container className="py-10">
				<Card>
					<CardHeader>
						<CardTitle>
							{t("waitlist_you_are_number", {
								n: submittedEntry.queueNumber,
							}) || `You are #${submittedEntry.queueNumber}`}
						</CardTitle>
						<CardDescription>
							{t("waitlist_verification_code_label") ||
								"Your verification code (show to staff):"}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="rounded-lg border bg-muted/50 p-4 text-center">
							<span className="text-3xl font-mono font-bold tracking-widest">
								{submittedEntry.verificationCode}
							</span>
						</div>
						<p className="text-sm text-muted-foreground">
							{t("waitlist_notify_when_ready") ||
								"We'll notify you when your table is ready. Show your code to staff when your number is called."}
						</p>
						<div className="flex flex-col gap-2 pt-2">
							<Link href={`/s/${storeId}/menu`}>
								<Button variant="outline" className="w-full">
									{t("waitlist_place_order") || "Place order while waiting"}
								</Button>
							</Link>
						</div>
					</CardContent>
				</Card>
			</Container>
		);
	}

	return (
		<Container className="py-10">
			<Card>
				<CardHeader>
					<CardTitle>{t("waitlist_title") || "Join the waitlist"}</CardTitle>
					<CardDescription>
						{t("waitlist_subtitle", { storeName }) ||
							`Join the queue at ${storeName}. We'll notify you when your table is ready.`}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{waitlistRequireSignIn && (
						<p className="mb-4 text-sm text-amber-600 dark:text-amber-400">
							{t("waitlist_sign_in_required") ||
								"Please sign in to join the waitlist."}
						</p>
					)}
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="numOfAdult"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("waitlist_party_adults") || "Adults"}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												type="number"
												min={1}
												className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
												disabled={isSubmitting}
												{...field}
												onChange={(e) =>
													field.onChange(
														e.target.value ? Number(e.target.value) : 1,
													)
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="numOfChild"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("waitlist_party_children") || "Children"}
										</FormLabel>
										<FormControl>
											<Input
												type="number"
												min={0}
												className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
												disabled={isSubmitting}
												{...field}
												onChange={(e) =>
													field.onChange(
														e.target.value ? Number(e.target.value) : 0,
													)
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("waitlist_name") || "First name (optional)"}
										</FormLabel>
										<FormControl>
											<Input
												className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
												placeholder={
													t("waitlist_name_placeholder") || "Optional"
												}
												disabled={isSubmitting}
												{...field}
												value={field.value ?? ""}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="lastName"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("waitlist_last_name") || "Last name (optional)"}
										</FormLabel>
										<FormControl>
											<Input
												className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
												placeholder={
													t("waitlist_last_name_placeholder") || "Optional"
												}
												disabled={isSubmitting}
												{...field}
												value={field.value ?? ""}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="phone"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("waitlist_phone") ||
												"Phone (optional, for notification)"}
										</FormLabel>
										<FormControl>
											<Input
												type="tel"
												className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
												placeholder={
													t("waitlist_phone_placeholder") || "Optional"
												}
												disabled={isSubmitting}
												{...field}
												value={field.value ?? ""}
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
									<FormItem>
										<FormLabel>
											{t("waitlist_message") || "Message (optional)"}
										</FormLabel>
										<FormControl>
											<Input
												className="h-10 text-base sm:h-9 sm:text-sm touch-manipulation"
												placeholder={
													t("waitlist_message_placeholder") || "Optional"
												}
												disabled={isSubmitting}
												{...field}
												value={field.value ?? ""}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button
								type="submit"
								className="w-full h-10 sm:h-9 touch-manipulation"
								disabled={isSubmitting || !form.formState.isValid}
							>
								{isSubmitting
									? t("waitlist_joining") || "Joining..."
									: t("waitlist_join_button") || "Join waitlist"}
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>
		</Container>
	);
}
