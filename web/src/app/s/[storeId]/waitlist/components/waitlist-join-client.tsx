"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
import { getWaitlistQueuePositionAction } from "@/actions/store/waitlist/get-waitlist-queue-position";
import {
	createWaitlistEntrySchema,
	type CreateWaitlistEntryInput,
} from "@/actions/store/waitlist/create-waitlist-entry.validation";
import { toastError, toastSuccess } from "@/components/toaster";
import { useIsHydrated } from "@/hooks/use-hydrated";
import { normalizePhoneNumber } from "@/utils/phone-utils";
import Link from "next/link";
import type { WaitlistSessionBlock } from "@/utils/waitlist-session";

const WAITLIST_STORAGE_KEY = "riben_waitlist";

const PHONE_COUNTRY_CODE_KEY = "phone_country_code";
const PHONE_LOCAL_NUMBER_KEY = "phone_local_number";

function getSavedPhoneFromFormPhoneOtp(): string | null {
	if (typeof window === "undefined") return null;
	const countryCode = localStorage.getItem(PHONE_COUNTRY_CODE_KEY);
	const localNumber = localStorage.getItem(PHONE_LOCAL_NUMBER_KEY);
	if (!countryCode || !localNumber?.trim()) return null;
	if (countryCode !== "+886" && countryCode !== "+1") return null;
	let local = localNumber.trim();
	if (countryCode === "+886" && local.startsWith("0")) {
		local = local.slice(1);
	}
	const full = `${countryCode}${local}`;
	return normalizePhoneNumber(full);
}

function saveWaitlistToStorage(entry: {
	id: string;
	storeId: string;
	queueNumber: number;
	verificationCode: string;
	sessionBlock: string;
	expiry: number;
}) {
	try {
		localStorage.setItem(WAITLIST_STORAGE_KEY, JSON.stringify(entry));
	} catch {
		// ignore
	}
}

function loadWaitlistFromStorage(storeId: string): {
	id: string;
	storeId: string;
	queueNumber: number;
	verificationCode: string;
	sessionBlock: string;
	expiry: number;
} | null {
	try {
		const raw = localStorage.getItem(WAITLIST_STORAGE_KEY);
		if (!raw) return null;
		const p = JSON.parse(raw) as Record<string, unknown>;
		if (p.storeId !== storeId) return null;
		if (typeof p.expiry === "number" && Date.now() > p.expiry) return null;
		if (
			typeof p.id === "string" &&
			typeof p.verificationCode === "string" &&
			typeof p.queueNumber === "number"
		) {
			return {
				id: p.id,
				storeId: p.storeId as string,
				queueNumber: p.queueNumber,
				verificationCode: p.verificationCode,
				sessionBlock:
					typeof p.sessionBlock === "string" ? p.sessionBlock : "morning",
				expiry: typeof p.expiry === "number" ? p.expiry : Date.now() + 86400000,
			};
		}
	} catch {
		// ignore
	}
	return null;
}

interface WaitlistJoinClientProps {
	storeId: string;
	storeName: string;
	waitlistEnabled: boolean;
	waitlistRequireSignIn: boolean;
	prefillPhone?: string | null;
	/** False when store uses business hours and is currently closed */
	waitlistAcceptingJoins: boolean;
	currentSessionBlock: WaitlistSessionBlock | null;
}

export function WaitlistJoinClient({
	storeId,
	storeName,
	waitlistEnabled,
	waitlistRequireSignIn,
	prefillPhone,
	waitlistAcceptingJoins,
	currentSessionBlock,
}: WaitlistJoinClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const isHydrated = useIsHydrated();
	const [submittedEntry, setSubmittedEntry] = useState<{
		queueNumber: number;
		verificationCode: string;
		id: string;
		sessionBlock: string;
	} | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [ahead, setAhead] = useState<number | null>(null);
	const [waitingInSession, setWaitingInSession] = useState<number | null>(null);
	const [queueStatus, setQueueStatus] = useState<string | null>(null);
	const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const sessionBlockLabel = useCallback(
		(block: string) => {
			switch (block) {
				case "morning":
					return t("waitlist_session_morning");
				case "afternoon":
					return t("waitlist_session_afternoon");
				case "evening":
					return t("waitlist_session_evening");
				default:
					return block;
			}
		},
		[t],
	);

	const refreshPosition = useCallback(async () => {
		if (!submittedEntry) return;
		const result = await getWaitlistQueuePositionAction({
			storeId,
			waitlistId: submittedEntry.id,
			verificationCode: submittedEntry.verificationCode,
		});
		const data = result?.data;
		if (!data?.ok) {
			setAhead(null);
			setWaitingInSession(null);
			setQueueStatus(null);
			return;
		}
		setAhead(data.ahead);
		setWaitingInSession(data.waitingInSession);
		setQueueStatus(data.status ?? null);
	}, [storeId, submittedEntry]);

	useEffect(() => {
		if (!isHydrated) return;
		const saved = loadWaitlistFromStorage(storeId);
		if (saved) {
			setSubmittedEntry({
				id: saved.id,
				queueNumber: saved.queueNumber,
				verificationCode: saved.verificationCode,
				sessionBlock: saved.sessionBlock,
			});
		}
	}, [isHydrated, storeId]);

	useEffect(() => {
		if (!submittedEntry) {
			if (pollRef.current) {
				clearInterval(pollRef.current);
				pollRef.current = null;
			}
			return;
		}
		void refreshPosition();
		pollRef.current = setInterval(() => void refreshPosition(), 12000);
		return () => {
			if (pollRef.current) clearInterval(pollRef.current);
		};
	}, [submittedEntry, refreshPosition]);

	const form = useForm<CreateWaitlistEntryInput>({
		resolver: zodResolver(
			createWaitlistEntrySchema,
		) as Resolver<CreateWaitlistEntryInput>,
		defaultValues: {
			storeId,
			customerId: null,
			phone: prefillPhone ?? "",
			numOfAdult: 1,
			numOfChild: 0,
		},
		mode: "onChange",
	});

	useEffect(() => {
		if (!isHydrated) return;
		const current = form.getValues("phone");
		if (current?.trim()) return;
		const saved = getSavedPhoneFromFormPhoneOtp();
		if (saved) {
			form.setValue("phone", saved);
		}
	}, [isHydrated, form]);

	const onSubmit = useCallback(
		async (data: CreateWaitlistEntryInput) => {
			setIsSubmitting(true);
			try {
				const result = await createWaitlistEntryAction({
					...data,
					storeId,
					phone: data.phone?.trim() || undefined,
				});
				if (result?.serverError) {
					toastError({
						title: t("waitlist_join_error") || "Error",
						description: result.serverError,
					});
					return;
				}
				if (result?.data?.entry) {
					const e = result.data.entry as {
						id: string;
						queueNumber: number;
						verificationCode: string;
						sessionBlock?: string;
					};
					const sessionBlock = e.sessionBlock ?? "morning";
					setSubmittedEntry({
						id: e.id,
						queueNumber: e.queueNumber,
						verificationCode: e.verificationCode,
						sessionBlock,
					});
					const d = new Date();
					d.setHours(23, 59, 59, 999);
					saveWaitlistToStorage({
						id: e.id,
						storeId,
						queueNumber: e.queueNumber,
						verificationCode: e.verificationCode,
						sessionBlock,
						expiry: d.getTime(),
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
		const showAhead =
			queueStatus === "waiting" && ahead !== null && waitingInSession !== null;
		const pctAhead =
			waitingInSession &&
			waitingInSession > 0 &&
			ahead !== null &&
			queueStatus === "waiting"
				? Math.min(
						100,
						Math.round(((waitingInSession - ahead) / waitingInSession) * 100),
					)
				: queueStatus === "waiting"
					? 0
					: 100;

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
							<span className="font-medium text-foreground">
								{sessionBlockLabel(submittedEntry.sessionBlock)}
							</span>
							{" · "}
							{t("waitlist_verification_code_label") ||
								"Your verification code (show to staff):"}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{showAhead && (
							<div className="space-y-2 rounded-lg border bg-muted/30 p-4">
								<div className="flex items-center justify-between text-sm">
									<span className="text-muted-foreground">
										{t("waitlist_queue_progress")}
									</span>
									<span className="font-semibold">
										{t("waitlist_ahead_count", { n: ahead })}
									</span>
								</div>
								<div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
									<div
										className="h-full rounded-full bg-primary transition-all duration-500"
										style={{ width: `${pctAhead}%` }}
									/>
								</div>
								<p className="text-xs text-muted-foreground">
									{t("waitlist_waiting_in_session", {
										n: waitingInSession ?? 0,
									})}
								</p>
							</div>
						)}
						{queueStatus === "called" && (
							<p className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm font-medium text-amber-900 dark:text-amber-100">
								{t("waitlist_status_called_message")}
							</p>
						)}
						{queueStatus === "seated" && (
							<p className="rounded-lg border border-green-600/40 bg-green-600/10 p-3 text-sm font-medium">
								{t("waitlist_status_seated_message")}
							</p>
						)}
						{(queueStatus === "cancelled" || queueStatus === "no_show") && (
							<p className="text-sm text-destructive">
								{t("waitlist_entry_ended")}
							</p>
						)}
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
			{!waitlistAcceptingJoins && currentSessionBlock === null && (
				<Card className="mb-4 border-muted">
					<CardHeader className="py-4">
						<CardTitle className="text-base">
							{t("waitlist_closed_now_title")}
						</CardTitle>
						<CardDescription>{t("waitlist_closed_now_body")}</CardDescription>
					</CardHeader>
				</Card>
			)}
			{waitlistAcceptingJoins && currentSessionBlock && (
				<p className="mb-4 text-center text-sm text-muted-foreground">
					{t("waitlist_current_session_label")}:{" "}
					<span className="font-medium text-foreground">
						{sessionBlockLabel(currentSessionBlock)}
					</span>
				</p>
			)}
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
							<div className="grid grid-cols-2 md:grid-cols-2 gap-4">
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
													className="h-20 text-lg text-center touch-manipulation"
													disabled={isSubmitting || !waitlistAcceptingJoins}
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
													className="h-20 text-lg text-center touch-manipulation"
													disabled={isSubmitting || !waitlistAcceptingJoins}
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
							</div>

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
												disabled={isSubmitting || !waitlistAcceptingJoins}
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
								disabled={
									isSubmitting ||
									!form.formState.isValid ||
									!waitlistAcceptingJoins
								}
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
